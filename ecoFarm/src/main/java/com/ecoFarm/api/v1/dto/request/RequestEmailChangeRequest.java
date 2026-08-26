package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Filed by a user who wants to change their email but can't clear the
 * self-service password check — a tenant admin or super admin reviews it. */
public record RequestEmailChangeRequest(
    @NotBlank @Email String requestedEmail,
    @Size(max = 500) String note
) {}
