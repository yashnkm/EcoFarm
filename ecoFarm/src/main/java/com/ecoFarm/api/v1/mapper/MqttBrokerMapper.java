package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.MqttBrokerResponse;
import com.ecoFarm.domain.entity.MqttBroker;
import org.springframework.stereotype.Component;

@Component
public class MqttBrokerMapper {

    public MqttBrokerResponse toResponse(MqttBroker b) {
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
            b.getCreatedAt()
        );
    }
}
