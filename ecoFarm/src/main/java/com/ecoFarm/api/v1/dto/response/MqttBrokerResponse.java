package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.BrokerStatus;

import java.time.Instant;
import java.util.UUID;

public record MqttBrokerResponse(
    UUID id,
    String name,
    String host,
    Integer port,
    boolean useTls,
    String username,
    // Password is intentionally never returned
    Integer keepaliveSeconds,
    Integer defaultQos,
    BrokerStatus status,
    String brokerUrl,
    Instant createdAt
) {}
