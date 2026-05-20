package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.BrokerStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateMqttBrokerRequest(
    String name,
    String host,
    @Min(1) @Max(65535) Integer port,
    Boolean useTls,
    String username,
    String password,
    Integer keepaliveSeconds,
    @Min(0) @Max(2) Integer defaultQos,
    BrokerStatus status
) {}
