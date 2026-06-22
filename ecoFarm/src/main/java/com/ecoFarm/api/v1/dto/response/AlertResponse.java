package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.AlertSeverity;
import com.ecoFarm.domain.enums.AlertStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AlertResponse(
    UUID id,
    UUID tenantId,
    UUID alertRuleId,
    String ruleName,
    UUID deviceId,
    String deviceName,
    String dataPointKey,
    BigDecimal triggeredValue,
    AlertSeverity severity,
    AlertStatus status,
    Instant triggeredAt,
    Instant acknowledgedAt,
    UUID acknowledgedBy,
    Instant resolvedAt,
    UUID resolvedBy
) {}
