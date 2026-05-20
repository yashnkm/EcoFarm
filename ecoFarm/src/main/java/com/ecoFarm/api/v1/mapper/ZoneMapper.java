package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.ZoneResponse;
import com.ecoFarm.domain.entity.Zone;
import org.springframework.stereotype.Component;

@Component
public class ZoneMapper {

    public ZoneResponse toResponse(Zone zone) {
        return new ZoneResponse(
            zone.getId(),
            zone.getSite().getId(),
            zone.getName(),
            zone.getDescription(),
            zone.getCreatedAt()
        );
    }
}
