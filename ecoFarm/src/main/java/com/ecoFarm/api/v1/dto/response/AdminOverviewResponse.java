package com.ecoFarm.api.v1.dto.response;

import java.util.List;
import java.util.UUID;

public record AdminOverviewResponse(
    List<TenantSummary> tenants,
    int totalDevices,
    int totalOnline,
    int totalOffline
) {
    public record TenantSummary(
        UUID id,
        String name,
        String slug,
        int deviceCount,
        int onlineCount,
        int offlineCount
    ) {}
}
