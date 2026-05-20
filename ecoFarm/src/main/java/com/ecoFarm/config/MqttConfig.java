package com.ecoFarm.config;

import com.ecoFarm.mqtt.DriverTopicResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.integration.config.EnableIntegration;
import org.springframework.integration.dsl.IntegrationFlow;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;

import java.util.Set;

@Slf4j
@Configuration
@EnableIntegration
@RequiredArgsConstructor
public class MqttConfig {

    public static final String INBOUND_CHANNEL  = "mqttInboundChannel";
    public static final String OUTBOUND_CHANNEL = "mqttOutboundChannel";

    private final MqttProperties props;
    private final DriverTopicResolver driverTopics;

    // ── Client factory ────────────────────────────────────────────

    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();

        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{ props.getBrokerUrl() });
        options.setAutomaticReconnect(true);
        options.setCleanSession(false);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);

        if (props.getUsername() != null && !props.getUsername().isBlank()) {
            options.setUserName(props.getUsername());
            options.setPassword(props.getPassword() == null ? new char[0] : props.getPassword().toCharArray());
        }

        factory.setConnectionOptions(options);
        return factory;
    }

    // ── Channels ───────────────────────────────────────────────

    @Bean(name = INBOUND_CHANNEL)
    public MessageChannel mqttInboundChannel() {
        return new PublishSubscribeChannel();
    }

    @Bean(name = OUTBOUND_CHANNEL)
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    // ── Inbound: broker → backend ────────────────────────────────

    @Bean
    public IntegrationFlow mqttInboundFlow(MqttPahoClientFactory factory) {
        // Build subscription list from registered drivers.
        // Fall back to convention-based topics so the backend can still boot
        // even if no drivers exist yet.
        Set<String> subs = driverTopics.allSubscriptions();
        if (subs.isEmpty()) {
            subs = Set.of("response/+", "status/+", "heartbeat/+", "errors/+");
            log.warn("No gateway drivers found — using default subscription topics");
        }
        String[] topicArray = subs.toArray(new String[0]);
        log.info("MQTT subscribing to: {}", String.join(", ", topicArray));

        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(
            props.getClientId() + "-inbound",
            factory,
            topicArray
        );
        adapter.setCompletionTimeout(10_000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(props.getQos());

        return IntegrationFlow
            .from(adapter)
            .channel(mqttInboundChannel())
            .get();
    }

    // ── Outbound: backend → broker ───────────────────────────────

    @Bean
    public IntegrationFlow mqttOutboundFlow(MqttPahoClientFactory factory) {
        MqttPahoMessageHandler handler = new MqttPahoMessageHandler(
            props.getClientId() + "-outbound", factory
        );
        handler.setAsync(true);
        handler.setDefaultQos(props.getQos());
        handler.setDefaultRetained(false);

        return IntegrationFlow
            .from(mqttOutboundChannel())
            .handle(handler)
            .get();
    }
}
