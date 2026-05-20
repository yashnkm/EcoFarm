package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record IssueCommandRequest(
    @NotNull UUID commandTemplateId
) {}
