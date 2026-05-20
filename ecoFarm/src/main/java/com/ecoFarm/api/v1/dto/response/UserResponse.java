package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
    UUID id,
    UUID tenantId,
    String email,
    String firstName,
    String lastName,
    Role role,
    UserStatus status,
    Instant activatedAt,
    Instant createdAt
) {}
