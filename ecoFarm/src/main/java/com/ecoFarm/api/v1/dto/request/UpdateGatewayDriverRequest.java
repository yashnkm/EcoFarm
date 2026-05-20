package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.GatewayProtocol;
import com.ecoFarm.domain.enums.GatewayTransport;
import jakarta.validation.constraints.Size;

public record UpdateGatewayDriverRequest(
    @Size(max = 255) String name,
    GatewayTransport transport,
    GatewayProtocol protocol,
    String requestFormat,
    String responseParser,
    Boolean supportsBroadcast,
    String messageType,
    String topicRequest,
    String topicResponse,
    String topicStatus
) {}
