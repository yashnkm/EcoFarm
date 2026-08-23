package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SamplingGroupRequest(
    @NotBlank String name,
    String description,
    @NotEmpty List<@Valid ChannelRefRequest> channels
) {}
