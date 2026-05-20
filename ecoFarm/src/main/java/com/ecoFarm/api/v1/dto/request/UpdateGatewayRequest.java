package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateGatewayRequest(
    @Size(max = 255) String name,
    UUID siteId,
    UUID zoneId,
    Integer baudRate,
    String parity,
    Integer stopBits
) {}
