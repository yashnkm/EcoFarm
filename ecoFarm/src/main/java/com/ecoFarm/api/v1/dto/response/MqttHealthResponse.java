package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;

public record MqttHealthResponse(
    boolean connected,
    String brokerUrl,
    Instant lastConnectedAt,
    Instant lastFailureAt,
    String lastError
) {}
