package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.CommandCategory;
import com.ecoFarm.domain.enums.Role;

import java.math.BigDecimal;
import java.util.UUID;

public record CommandTemplateResponse(
    UUID id,
    UUID profileId,
    String name,
    String key,
    String description,
    Integer registerNumber,
    Integer functionCode,
    Integer value,
    boolean confirmationRequired,
    Role minRole,
    boolean promptForValue,
    Integer offValue,
    String statusDataPointKey,
    CommandCategory category,
    BigDecimal scaleFactor,
    BigDecimal offset,
    String unit
) {}
