package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.TenantStatus;
import jakarta.validation.constraints.Size;

public record UpdateTenantRequest(
    @Size(max = 255) String name,
    TenantStatus status,
    String plan
) {}
