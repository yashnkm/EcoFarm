package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SamplingGroupResponse(
    UUID id,
    String name,
    String description,
    Integer sampleIntervalMinutes,
    Integer retentionDays,
    Instant createdAt,
    List<ChannelResponse> channels
) {}
