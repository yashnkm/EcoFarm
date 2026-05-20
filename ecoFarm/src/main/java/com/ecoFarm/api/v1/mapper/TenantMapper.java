package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.TenantResponse;
import com.ecoFarm.domain.entity.Tenant;
import org.springframework.stereotype.Component;

@Component
public class TenantMapper {

    public TenantResponse toResponse(Tenant t) {
        return new TenantResponse(
            t.getId(),
            t.getName(),
            t.getSlug(),
            t.getStatus(),
            t.getPlan(),
            t.getMqttBroker() != null ? t.getMqttBroker().getId() : null,
            t.getMqttBroker() != null ? t.getMqttBroker().getName() : null,
            t.getCreatedAt()
        );
    }
}
