package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateZoneRequest(
    @NotBlank @Size(max = 255) String name,
    String description
) {}
