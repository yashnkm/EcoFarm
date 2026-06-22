package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.AlertCondition;
import com.ecoFarm.domain.enums.AlertSeverity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AlertRuleResponse(
    UUID id,
    UUID tenantId,
    UUID deviceId,
    String deviceName,
    String dataPointKey,
    String name,
    AlertCondition condition,
    BigDecimal threshold,
    AlertSeverity severity,
    boolean enabled,
    Integer cooldownMinutes,
    Instant createdAt,
    Instant updatedAt
) {}
