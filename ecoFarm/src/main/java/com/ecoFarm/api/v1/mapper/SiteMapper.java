package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.SiteResponse;
import com.ecoFarm.domain.entity.Site;
import org.springframework.stereotype.Component;

@Component
public class SiteMapper {

    public SiteResponse toResponse(Site site) {
        return new SiteResponse(
            site.getId(),
            site.getTenant().getId(),
            site.getName(),
            site.getAddress(),
            site.getLat(),
            site.getLng(),
            site.getTimezone(),
            site.getStatus(),
            site.getCreatedAt(),
            site.getUpdatedAt()
        );
    }
}
