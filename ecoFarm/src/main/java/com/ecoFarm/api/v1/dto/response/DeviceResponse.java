package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.DeviceProtocol;
import com.ecoFarm.domain.enums.DeviceStatus;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public record DeviceResponse(
    UUID id,
    UUID tenantId,
    UUID gatewayId,
    UUID siteId,
    UUID zoneId,
    UUID profileId,
    String profileName,
    String name,
    Integer slaveId,
    DeviceProtocol protocol,
    String ipAddress,
    Integer port,
    Integer timeoutSeconds,
    DeviceStatus status,
    Instant lastReadingAt,
    Instant createdAt,
    Set<String> recordedDataPoints,
    Map<String, String> dataPointGroups
) {}
