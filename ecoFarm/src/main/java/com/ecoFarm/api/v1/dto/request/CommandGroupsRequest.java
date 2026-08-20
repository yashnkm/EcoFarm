package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CommandGroupsRequest(
    @NotNull Map<String, String> commandGroups
) {}
