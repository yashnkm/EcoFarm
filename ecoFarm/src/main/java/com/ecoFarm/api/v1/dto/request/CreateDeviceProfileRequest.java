package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.DeviceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDeviceProfileRequest(
    @NotBlank @Size(max = 255) String name,
    String manufacturer,
    String model,
    DeviceCategory category,
    String description,
    Boolean global  // super admin can create global profiles (tenant_id = NULL)
) {}
