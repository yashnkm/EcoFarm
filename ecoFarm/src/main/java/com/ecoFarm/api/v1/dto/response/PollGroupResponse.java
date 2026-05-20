package com.ecoFarm.api.v1.dto.response;

import java.util.UUID;

public record PollGroupResponse(
    UUID id,
    UUID profileId,
    String name,
    Integer intervalSeconds,
    Integer startRegister,
    Integer count
) {}
