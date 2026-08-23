package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** One channel reference in a SamplingGroupRequest — a device + one of its data point keys. */
public record ChannelRefRequest(
    @NotNull UUID deviceId,
    @NotBlank String dataPointKey
) {}
