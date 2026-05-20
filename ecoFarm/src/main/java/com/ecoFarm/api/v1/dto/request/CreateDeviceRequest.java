package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.DeviceProtocol;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDeviceRequest(
    @NotNull UUID gatewayId,
    @NotNull UUID profileId,
    @NotBlank String name,
    @NotNull @Min(1) Integer slaveId,
    DeviceProtocol protocol,
    String ipAddress,
    Integer port,
    UUID zoneId,
    Integer timeoutSeconds
) {}
