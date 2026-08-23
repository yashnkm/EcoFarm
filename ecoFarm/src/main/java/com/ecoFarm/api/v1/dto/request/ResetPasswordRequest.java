package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Completes either flow that hands out a PasswordResetToken: the forced
 * first-login password change, and (once built) "forgot password". The
 * token proves identity here — no separate auth needed on this endpoint. */
public record ResetPasswordRequest(
    @NotBlank String token,
    @NotBlank @Size(min = 8, max = 128) String newPassword
) {}
