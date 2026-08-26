package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Size;

public record RejectEmailChangeRequest(
    @Size(max = 500) String reason
) {}
