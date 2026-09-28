package com.ecoFarm.api.v1.dto.response;

public record DiskHealthResponse(
    long totalBytes,
    long usedBytes,
    long freeBytes,
    double usedPercent,
    Level level
) {
    public enum Level { OK, WARNING, CRITICAL }
}
