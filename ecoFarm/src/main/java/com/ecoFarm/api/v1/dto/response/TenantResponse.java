package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.TenantStatus;

import java.time.Instant;
import java.util.UUID;

public record TenantResponse(
    UUID id,
    String name,
    String slug,
    TenantStatus status,
    String plan,
    Instant createdAt
) {}
