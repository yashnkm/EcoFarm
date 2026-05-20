package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.GatewayProtocol;
import com.ecoFarm.domain.enums.GatewayTransport;

import java.time.Instant;
import java.util.UUID;

public record GatewayDriverResponse(
    UUID id,
    String name,
    GatewayTransport transport,
    GatewayProtocol protocol,
    String requestFormat,
    String responseParser,
    boolean supportsBroadcast,
    String messageType,
    String topicRequest,
    String topicResponse,
    String topicStatus,
    Instant createdAt
) {}
