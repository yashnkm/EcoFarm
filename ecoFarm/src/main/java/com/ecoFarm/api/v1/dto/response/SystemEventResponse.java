package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.EventSeverity;

import java.time.Instant;
import java.util.UUID;

public record SystemEventResponse(
    UUID id,
    String tenantName,
    String eventType,
    String siteName,
    String gatewaySerial,
    String deviceName,
    EventSeverity severity,
    String message,
    String payload,
    Instant createdAt
) {}
