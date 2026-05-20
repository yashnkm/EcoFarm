package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.DeviceProtocol;

import java.util.UUID;

public record UpdateDeviceRequest(
    String name,
    DeviceProtocol protocol,
    String ipAddress,
    Integer port,
    UUID zoneId,
    Integer timeoutSeconds
) {}
