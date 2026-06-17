package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.DataType;
import com.ecoFarm.domain.enums.DisplayWidget;

import java.math.BigDecimal;
import java.util.UUID;

public record DataPointResponse(
    UUID id,
    UUID profileId,
    UUID pollGroupId,
    String key,
    String label,
    Integer registerNumber,
    Integer functionCode,
    DataType dataType,
    Integer wordCount,
    ByteOrder byteOrder,
    BigDecimal scaleFactor,
    BigDecimal offset,
    String unit,
    BigDecimal minValue,
    BigDecimal maxValue,
    boolean writable,
    boolean displayed,
    DisplayWidget displayWidget,
    String displayGroup,
    String falseLabel,
    String trueLabel
) {}
