package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.MqttBrokerResponse;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.mqtt.MqttConnectionManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MqttBrokerMapper {

    private final MqttConnectionManager connectionManager;

    public MqttBrokerResponse toResponse(MqttBroker b) {
        MqttConnectionManager.BrokerHealth health = connectionManager.healthFor(b);
        return new MqttBrokerResponse(
            b.getId(),
            b.getName(),
            b.getHost(),
            b.getPort(),
            b.isUseTls(),
            b.getUsername(),
            b.getKeepaliveSeconds(),
            b.getDefaultQos(),
            b.getStatus(),
            b.getBrokerUrl(),
            health.connected(),
            health.lastError(),
            b.getCreatedAt()
        );
    }
}
