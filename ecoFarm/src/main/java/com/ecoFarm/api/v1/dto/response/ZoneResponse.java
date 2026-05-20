package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ZoneResponse(
    UUID id,
    UUID siteId,
    String name,
    String description,
    Instant createdAt
) {}
