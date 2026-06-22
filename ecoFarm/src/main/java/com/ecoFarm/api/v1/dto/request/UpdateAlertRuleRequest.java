package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.AlertCondition;
import com.ecoFarm.domain.enums.AlertSeverity;

import java.math.BigDecimal;

public record UpdateAlertRuleRequest(
    String name,
    AlertCondition condition,
    BigDecimal threshold,
    AlertSeverity severity,
    Integer cooldownMinutes,
    Boolean enabled
) {}
