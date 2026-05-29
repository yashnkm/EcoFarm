package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;
import java.util.UUID;

public record MqttHealthResponse(
    UUID brokerId,
    boolean connected,
    String brokerUrl,
    String brokerName,
    Instant lastConnectedAt,
    Instant lastFailureAt,
    String lastError
) {}
