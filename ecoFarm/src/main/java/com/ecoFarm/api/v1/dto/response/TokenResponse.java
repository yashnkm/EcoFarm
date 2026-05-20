package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.Role;

import java.util.UUID;

public record TokenResponse(
    String accessToken,
    String refreshToken,
    long expiresInSeconds,
    UserSummary user
) {
    public record UserSummary(
        UUID id,
        String email,
        String firstName,
        String lastName,
        Role role,
        UUID tenantId,
        String tenantName
    ) {}
}
