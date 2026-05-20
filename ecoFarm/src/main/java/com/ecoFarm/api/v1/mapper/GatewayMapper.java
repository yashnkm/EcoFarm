package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.GatewayResponse;
import com.ecoFarm.domain.entity.Gateway;
import org.springframework.stereotype.Component;

@Component
public class GatewayMapper {

    public GatewayResponse toResponse(Gateway gw) {
        return new GatewayResponse(
            gw.getId(),
            gw.getTenant().getId(),
            gw.getSite() != null ? gw.getSite().getId() : null,
            gw.getZone() != null ? gw.getZone().getId() : null,
            gw.getDriver().getId(),
            gw.getDriver().getName(),
            gw.getSerialNumber(),
            gw.getMqttClientId(),
            gw.getName(),
            gw.getBaudRate(),
            gw.getParity(),
            gw.getStopBits(),
            gw.getStatus(),
            gw.getLastSeen(),
            gw.getCreatedAt()
        );
    }
}
