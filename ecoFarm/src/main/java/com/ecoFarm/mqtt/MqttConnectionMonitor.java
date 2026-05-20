package com.ecoFarm.mqtt;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.integration.mqtt.event.MqttConnectionFailedEvent;
import org.springframework.integration.mqtt.event.MqttSubscribedEvent;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Tracks live MQTT connection state by listening to Spring Integration MQTT
 * lifecycle events. Surfaces current status to the REST health endpoint.
 */
@Slf4j
@Component
@Getter
public class MqttConnectionMonitor {

    private volatile boolean connected = false;
    private volatile Instant lastConnectedAt;
    private volatile Instant lastFailureAt;
    private volatile String lastError;

    @EventListener
    public void onSubscribed(MqttSubscribedEvent event) {
        connected = true;
        lastConnectedAt = Instant.now();
        lastError = null;
        log.info("MQTT subscribed: {}", event.getMessage());
    }

    @EventListener
    public void onFailure(MqttConnectionFailedEvent event) {
        connected = false;
        lastFailureAt = Instant.now();
        Throwable cause = event.getCause();
        lastError = cause != null ? cause.getMessage() : "Unknown";
        log.warn("MQTT connection failed: {}", lastError);
    }
}
