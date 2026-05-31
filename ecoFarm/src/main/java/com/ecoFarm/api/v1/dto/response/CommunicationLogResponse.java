package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.LogDirection;
import com.ecoFarm.domain.enums.LogStatus;

import java.time.Instant;
import java.util.UUID;

public record CommunicationLogResponse(
    UUID id,
    String tenantName,
    String gatewaySerial,
    String deviceName,
    LogDirection direction,
    Integer modbusFc,
    Integer register,
    String value,
    LogStatus status,
    String errorMessage,
    Instant createdAt
) {}
