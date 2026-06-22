package com.ecoFarm.ingestion;

import com.ecoFarm.domain.enums.AlertSeverity;
import com.ecoFarm.domain.enums.AlertStatus;

import java.time.Instant;
import java.util.UUID;

public record AlertMessage(
    UUID alertId,
    UUID alertRuleId,
    String ruleName,
    UUID deviceId,
    String deviceName,
    String dataPointKey,
    double triggeredValue,
    AlertSeverity severity,
    AlertStatus status,
    Instant triggeredAt
) {}
