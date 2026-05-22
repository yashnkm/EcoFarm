package com.ecoFarm.mqtt;

import com.ecoFarm.config.MqttConfig;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.domain.enums.BrokerStatus;
import com.ecoFarm.repository.MqttBrokerRepository;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Maintains one live MQTT connection per {@link MqttBroker} row in the database.
 *
 * Replaces the old single global broker connection: each tenant routes through
 * its assigned broker, so the platform can talk to many brokers at once. Inbound
 * messages from every broker are funnelled into the shared inbound channel, where
 * {@link MqttInboundHandler} resolves the gateway (and therefore the tenant) by
 * serial number — so inbound routing stays tenant-correct regardless of broker.
 */
@Slf4j
@Component
public class MqttConnectionManager {

    private static final Set<String> DEFAULT_SUBSCRIPTIONS =
        Set.of("response/+", "status/+", "heartbeat/+", "errors/+");

    private final MqttBrokerRepository brokerRepository;
    private final DriverTopicResolver driverTopics;
    private final MessageChannel inboundChannel;

    private final Map<UUID, ManagedConnection> connections = new ConcurrentHashMap<>();

    public MqttConnectionManager(MqttBrokerRepository brokerRepository,
                                 DriverTopicResolver driverTopics,
                                 @Qualifier(MqttConfig.INBOUND_CHANNEL) MessageChannel inboundChannel) {
        this.brokerRepository = brokerRepository;
        this.driverTopics = driverTopics;
        this.inboundChannel = inboundChannel;
    }

    /** Bring up a connection for every broker once the app is ready. Non-blocking. */
    @EventListener(ApplicationReadyEvent.class)
    public void connectAll() {
        List<MqttBroker> brokers = brokerRepository.findAll();
        log.info("MQTT: bringing up {} broker connection(s)", brokers.size());
        for (MqttBroker broker : brokers) {
            connect(broker);
        }
    }

    /** Open (or replace) the connection for a broker. Safe to call repeatedly. */
    public void connect(MqttBroker broker) {
        if (broker.getStatus() == BrokerStatus.DISABLED) {
            log.info("MQTT: broker '{}' is DISABLED — not connecting", broker.getName());
            disconnect(broker.getId());
            return;
        }
        connections.compute(broker.getId(), (id, existing) -> {
            if (existing != null) existing.shutdown();
            ManagedConnection conn = new ManagedConnection(broker);
            conn.start();
            return conn;
        });
    }

    /** Tear down and re-open a broker's connection — used after the broker is edited. */
    public void reconnect(MqttBroker broker) {
        connect(broker);
    }

    /** Close and forget a broker's connection — used after the broker is deleted/disabled. */
    public void disconnect(UUID brokerId) {
        ManagedConnection conn = connections.remove(brokerId);
        if (conn != null) conn.shutdown();
    }

    /** Publish a payload to the given tenant's broker. No-op (logged) if unavailable. */
    public void publish(MqttBroker broker, String topic, String payload) {
        if (broker == null) {
            log.warn("MQTT: publish to '{}' skipped — no broker assigned", topic);
            return;
        }
        ManagedConnection conn = connections.get(broker.getId());
        if (conn == null) {
            log.warn("MQTT: publish to '{}' skipped — broker '{}' has no active connection",
                topic, broker.getName());
            return;
        }
        conn.publish(topic, payload);
    }

    /** Live connection status for a broker. */
    public BrokerHealth healthFor(MqttBroker broker) {
        ManagedConnection conn = broker != null ? connections.get(broker.getId()) : null;
        if (conn == null) {
            return new BrokerHealth(false, null, null, "Not connected");
        }
        return conn.health();
    }

    @PreDestroy
    public void shutdownAll() {
        connections.values().forEach(ManagedConnection::shutdown);
        connections.clear();
    }

    public record BrokerHealth(boolean connected,
                               Instant lastConnectedAt,
                               Instant lastFailureAt,
                               String lastError) {}

    // ── one connection to one broker ─────────────────────────────

    private class ManagedConnection {

        private final MqttBroker broker;
        private final int qos;
        private volatile MqttAsyncClient client;
        private volatile boolean connected;
        private volatile Instant lastConnectedAt;
        private volatile Instant lastFailureAt;
        private volatile String lastError;

        ManagedConnection(MqttBroker broker) {
            this.broker = broker;
            this.qos = broker.getDefaultQos() != null ? broker.getDefaultQos() : 1;
        }

        void start() {
            try {
                String clientId = "ecofarm-" + broker.getId().toString().substring(0, 8);
                client = new MqttAsyncClient(broker.getBrokerUrl(), clientId, new MemoryPersistence());
                client.setCallback(new Callback());

                MqttConnectOptions opts = new MqttConnectOptions();
                opts.setAutomaticReconnect(true);
                opts.setCleanSession(true);
                opts.setConnectionTimeout(10);
                opts.setKeepAliveInterval(
                    broker.getKeepaliveSeconds() != null ? broker.getKeepaliveSeconds() : 60);
                if (broker.getUsername() != null && !broker.getUsername().isBlank()) {
                    opts.setUserName(broker.getUsername());
                    opts.setPassword(broker.getPassword() == null
                        ? new char[0] : broker.getPassword().toCharArray());
                }

                log.info("MQTT: connecting to broker '{}' at {}",
                    broker.getName(), broker.getBrokerUrl());
                client.connect(opts, null, new IMqttActionListener() {
                    @Override public void onSuccess(IMqttToken token) {
                        // subscription happens in connectComplete callback
                    }
                    @Override public void onFailure(IMqttToken token, Throwable ex) {
                        markFailure(ex);
                    }
                });
            } catch (MqttException e) {
                markFailure(e);
            }
        }

        void publish(String topic, String payload) {
            MqttAsyncClient c = client;
            if (c == null || !c.isConnected()) {
                log.warn("MQTT: cannot publish to '{}' — broker '{}' not connected",
                    topic, broker.getName());
                return;
            }
            try {
                MqttMessage msg = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
                msg.setQos(qos);
                msg.setRetained(false);
                c.publish(topic, msg);
                log.debug("MQTT → [{}] {} : {}", broker.getName(), topic, payload);
            } catch (MqttException e) {
                log.error("MQTT: publish failed on broker '{}': {}",
                    broker.getName(), e.getMessage());
            }
        }

        private void subscribe() {
            Set<String> subs = driverTopics.allSubscriptions();
            if (subs.isEmpty()) {
                subs = DEFAULT_SUBSCRIPTIONS;
                log.warn("MQTT: no gateway drivers — broker '{}' using default topics",
                    broker.getName());
            }
            for (String topic : subs) {
                try {
                    client.subscribe(topic, qos);
                } catch (MqttException e) {
                    log.error("MQTT: subscribe failed [{}] {}: {}",
                        broker.getName(), topic, e.getMessage());
                }
            }
            log.info("MQTT: broker '{}' subscribed to {}", broker.getName(), subs);
        }

        BrokerHealth health() {
            return new BrokerHealth(connected, lastConnectedAt, lastFailureAt, lastError);
        }

        private void markFailure(Throwable ex) {
            connected = false;
            lastFailureAt = Instant.now();
            lastError = ex != null ? ex.getMessage() : "Unknown error";
            log.warn("MQTT: broker '{}' connection failed: {}", broker.getName(), lastError);
        }

        void shutdown() {
            MqttAsyncClient c = client;
            connected = false;
            if (c == null) return;
            try {
                if (c.isConnected()) c.disconnect();
            } catch (MqttException e) {
                log.debug("MQTT: error disconnecting broker '{}': {}",
                    broker.getName(), e.getMessage());
            }
            try {
                c.close();
            } catch (MqttException e) {
                log.debug("MQTT: error closing broker '{}': {}",
                    broker.getName(), e.getMessage());
            }
        }

        private class Callback implements MqttCallbackExtended {

            @Override
            public void connectComplete(boolean reconnect, String serverURI) {
                connected = true;
                lastConnectedAt = Instant.now();
                lastError = null;
                log.info("MQTT: broker '{}' connected ({})",
                    broker.getName(), reconnect ? "reconnected" : "initial");
                subscribe();
            }

            @Override
            public void connectionLost(Throwable cause) {
                connected = false;
                lastFailureAt = Instant.now();
                lastError = cause != null ? cause.getMessage() : "Connection lost";
                log.warn("MQTT: broker '{}' connection lost: {}", broker.getName(), lastError);
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                log.debug("MQTT ← [{}] {} : {}", broker.getName(), topic, payload);
                try {
                    inboundChannel.send(MessageBuilder
                        .withPayload(payload)
                        .setHeader(MqttHeaders.RECEIVED_TOPIC, topic)
                        .build());
                } catch (Exception e) {
                    log.error("MQTT: failed to dispatch inbound message from '{}': {}",
                        broker.getName(), e.getMessage(), e);
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
                // outbound delivery confirmations are not tracked
            }
        }
    }
}
