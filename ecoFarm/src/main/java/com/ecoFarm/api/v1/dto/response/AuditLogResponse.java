package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
    UUID id,
    String tenantName,
    String userEmail,
    String action,
    String resourceType,
    UUID resourceId,
    String payload,
    String ipAddress,
    Instant createdAt
) {}
