package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.CommandStatus;

import java.time.Instant;
import java.util.UUID;

public record ControlCommandResponse(
    UUID id,
    UUID deviceId,
    UUID issuedBy,
    Integer registerNumber,
    Integer functionCode,
    Integer value,
    CommandStatus status,
    Instant sentAt,
    Instant acknowledgedAt,
    String result,
    Instant createdAt
) {}
