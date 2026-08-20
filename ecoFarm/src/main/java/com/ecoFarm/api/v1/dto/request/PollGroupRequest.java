package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PollGroupRequest(
    @NotBlank String name,
    @NotNull @Min(1) Integer intervalSeconds,
    @NotNull @Min(0) Integer startRegister,
    @NotNull @Min(1) Integer count,
    @NotNull @Min(1) Integer functionCode
) {}
