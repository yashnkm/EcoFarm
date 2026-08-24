package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.Set;

public record RecordedDataPointsRequest(
    @NotNull Set<String> dataPoints,
    Map<String, Integer> retentionDays
) {}
