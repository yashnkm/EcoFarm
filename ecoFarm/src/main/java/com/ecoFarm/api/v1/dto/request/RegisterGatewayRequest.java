package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record RegisterGatewayRequest(
    @NotBlank String serialNumber,
    @NotNull UUID driverId,
    String name,
    UUID siteId,
    UUID zoneId,
    String mqttClientId,
    // RS485 bus settings — shared by every device on this gateway
    Integer baudRate,
    String parity,
    Integer stopBits
) {}
