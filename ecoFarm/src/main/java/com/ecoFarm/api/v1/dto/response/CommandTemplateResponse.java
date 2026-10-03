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
    // True when statusDataPointKey is our own auto-created internal point
    // (see DataPoint#isVirtual), not a real reading from the device — lets
    // the frontend show "last set by you" instead of implying a confirmed
    // device state, and round-trip the status-point picker back to "None"
    // instead of offering an internal key as if it were pickable.
    boolean usesInternalStatus,
    CommandCategory category,
    BigDecimal scaleFactor,
    BigDecimal offset,
    String unit
) {}
