package com.ecoFarm.mqtt;

import com.ecoFarm.domain.entity.MqttBroker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Publishes messages to a tenant's assigned MQTT broker. */
@Slf4j
@Component
@RequiredArgsConstructor
public class MqttPublisher {

    private final MqttConnectionManager connectionManager;

    /** Publish to {@code broker}. A null broker (tenant has none assigned) is logged and skipped. */
    public void publish(MqttBroker broker, String topic, String payload) {
        connectionManager.publish(broker, topic, payload);
    }
}
