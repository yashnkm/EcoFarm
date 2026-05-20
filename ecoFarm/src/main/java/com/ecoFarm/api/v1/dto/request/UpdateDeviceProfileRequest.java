package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.DeviceCategory;
import jakarta.validation.constraints.Size;

public record UpdateDeviceProfileRequest(
    @Size(max = 255) String name,
    String manufacturer,
    String model,
    DeviceCategory category,
    String description
) {}
