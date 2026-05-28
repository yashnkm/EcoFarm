package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.DataType;
import com.ecoFarm.domain.enums.DisplayWidget;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record DataPointRequest(
    @NotBlank @Size(max = 100) String key,
    @NotBlank String label,
    @NotNull Integer registerNumber,
    DataType dataType,
    Integer wordCount,
    ByteOrder byteOrder,
    BigDecimal scaleFactor,
    BigDecimal offset,
    String unit,
    BigDecimal minValue,
    BigDecimal maxValue,
    Boolean writable,
    Boolean displayed,
    DisplayWidget displayWidget,
    @NotNull UUID pollGroupId
) {}
