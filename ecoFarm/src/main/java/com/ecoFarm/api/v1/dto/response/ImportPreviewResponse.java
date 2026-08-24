package com.ecoFarm.api.v1.dto.response;

import java.util.List;

public record ImportPreviewResponse(
    int newCount,
    int updateCount,
    int errorCount,
    List<ImportRowResult> rows,
    List<String> fileErrors // parse-level errors not tied to a specific typed row (e.g. unknown Type)
) {
    public boolean hasErrors() {
        return errorCount > 0 || !fileErrors.isEmpty();
    }
}
