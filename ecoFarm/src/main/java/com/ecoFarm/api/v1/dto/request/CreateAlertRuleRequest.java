package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.AlertCondition;
import com.ecoFarm.domain.enums.AlertSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateAlertRuleRequest(
    @NotNull UUID deviceId,
    @NotBlank String dataPointKey,
    @NotBlank String name,
    @NotNull AlertCondition condition,
    @NotNull BigDecimal threshold,
    AlertSeverity severity,
    Integer cooldownMinutes
) {}
