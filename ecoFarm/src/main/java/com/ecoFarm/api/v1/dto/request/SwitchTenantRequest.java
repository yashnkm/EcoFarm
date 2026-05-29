package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SwitchTenantRequest(@NotBlank String slug) {}
