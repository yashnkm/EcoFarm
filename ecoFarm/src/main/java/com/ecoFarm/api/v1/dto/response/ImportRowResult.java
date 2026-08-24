package com.ecoFarm.api.v1.dto.response;

import java.util.List;

public record ImportRowResult(
    int rowNumber,
    String type,       // "PollGroup" | "DataPoint" | "Command"
    String identifier, // name (PollGroup) or key (DataPoint/Command)
    String action,      // "create" | "update"
    List<String> errors
) {}
