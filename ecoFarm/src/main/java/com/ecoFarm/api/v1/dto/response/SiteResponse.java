package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.SiteStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SiteResponse(
    UUID id,
    UUID tenantId,
    String name,
    String address,
    BigDecimal lat,
    BigDecimal lng,
    String timezone,
    SiteStatus status,
    Instant createdAt,
    Instant updatedAt
) {}
