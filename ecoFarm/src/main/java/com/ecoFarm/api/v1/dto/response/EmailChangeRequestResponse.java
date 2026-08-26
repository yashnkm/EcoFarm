package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.EmailChangeRequestStatus;

import java.time.Instant;
import java.util.UUID;

public record EmailChangeRequestResponse(
    UUID id,
    UUID userId,
    String requesterName,
    String requesterEmail,
    String requestedEmail,
    String note,
    EmailChangeRequestStatus status,
    Instant createdAt
) {}
