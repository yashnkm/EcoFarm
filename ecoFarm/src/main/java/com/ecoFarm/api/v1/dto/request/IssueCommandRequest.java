package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record IssueCommandRequest(
    @NotNull UUID commandTemplateId,
    /** Required when the template has promptForValue set; ignored otherwise —
     * fixed commands always send their own stored value, never a client-supplied one.
     * This is the operator-facing engineering value (e.g. 22.5 for °C, 30 for
     * seconds) — DeviceService converts it to a raw register value using the
     * command's own scaleFactor/offset before dispatch. */
    BigDecimal value
) {}
