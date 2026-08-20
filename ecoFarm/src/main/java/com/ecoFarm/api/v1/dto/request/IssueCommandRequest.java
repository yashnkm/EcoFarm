package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record IssueCommandRequest(
    @NotNull UUID commandTemplateId,
    /** Required when the template has promptForValue set; ignored otherwise —
     * fixed commands always send their own stored value, never a client-supplied one. */
    Integer value
) {}
