package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.DeviceCategory;

import java.time.Instant;
import java.util.UUID;

public record DeviceProfileResponse(
    UUID id,
    UUID tenantId,   // null = global platform profile
    String name,
    String manufacturer,
    String model,
    DeviceCategory category,
    String description,
    boolean global,
    Instant createdAt
) {}
