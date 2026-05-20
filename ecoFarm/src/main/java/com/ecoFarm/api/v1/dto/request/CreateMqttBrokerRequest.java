package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMqttBrokerRequest(
    @NotBlank String name,
    @NotBlank String host,
    @NotNull @Min(1) @Max(65535) Integer port,
    Boolean useTls,
    String username,
    String password,
    Integer keepaliveSeconds,
    @Min(0) @Max(2) Integer defaultQos
) {}
