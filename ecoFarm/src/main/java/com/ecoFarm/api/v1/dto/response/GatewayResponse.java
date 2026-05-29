package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.GatewayStatus;

import java.time.Instant;
import java.util.UUID;

public record GatewayResponse(
    UUID id,
    UUID tenantId,
    UUID siteId,
    UUID zoneId,
    UUID driverId,
    String driverName,
    UUID mqttBrokerId,
    String mqttBrokerName,
    String serialNumber,
    String mqttClientId,
    String name,
    Integer baudRate,
    String parity,
    Integer stopBits,
    GatewayStatus status,
    Instant lastSeen,
    Instant createdAt
) {}
