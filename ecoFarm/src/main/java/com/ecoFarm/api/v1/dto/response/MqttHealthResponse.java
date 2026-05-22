package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;

public record MqttHealthResponse(
    boolean connected,
    String brokerUrl,
    String brokerName,
    Instant lastConnectedAt,
    Instant lastFailureAt,
    String lastError
) {}
