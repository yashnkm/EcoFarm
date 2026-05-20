package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ClaimGatewayRequest(
    @NotBlank String name,
    @NotNull UUID siteId,
    UUID zoneId
) {}
