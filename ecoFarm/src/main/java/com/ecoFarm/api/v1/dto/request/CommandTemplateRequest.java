package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.CommandCategory;
import com.ecoFarm.domain.enums.Role;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CommandTemplateRequest(
    @NotBlank String name,
    @Size(max = 100) String key,
    String description,
    @NotNull @Min(0) Integer registerNumber,
    @NotNull @Min(1) Integer functionCode,
    @NotNull Integer value,
    Boolean confirmationRequired,
    Role minRole,
    Boolean promptForValue,
    Integer offValue,
    String statusDataPointKey,
    CommandCategory category,
    BigDecimal scaleFactor,
    BigDecimal offset,
    String unit
) {}
