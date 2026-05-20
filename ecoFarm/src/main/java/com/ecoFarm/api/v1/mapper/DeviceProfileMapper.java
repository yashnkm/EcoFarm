package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.DeviceProfileResponse;
import com.ecoFarm.domain.entity.DeviceProfile;
import org.springframework.stereotype.Component;

@Component
public class DeviceProfileMapper {

    public DeviceProfileResponse toResponse(DeviceProfile p) {
        return new DeviceProfileResponse(
            p.getId(),
            p.getTenant() != null ? p.getTenant().getId() : null,
            p.getName(),
            p.getManufacturer(),
            p.getModel(),
            p.getCategory(),
            p.getDescription(),
            p.getTenant() == null,
            p.getCreatedAt()
        );
    }
}
