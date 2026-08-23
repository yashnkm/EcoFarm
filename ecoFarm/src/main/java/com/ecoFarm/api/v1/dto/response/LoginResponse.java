package com.ecoFarm.api.v1.dto.response;

/**
 * Two shapes in one, depending on whether the account still has a
 * one-time invite password:
 *   - mustSetPassword=false: tokens is populated, login succeeded normally.
 *   - mustSetPassword=true: tokens is null, resetToken is populated — the
 *     client must go set a real password (POST /auth/set-password) before
 *     anything else works. No access/refresh tokens are ever issued for an
 *     account in this state.
 */
public record LoginResponse(
    boolean mustSetPassword,
    String resetToken,
    TokenResponse tokens
) {
    public static LoginResponse mustSetPassword(String resetToken) {
        return new LoginResponse(true, resetToken, null);
    }

    public static LoginResponse success(TokenResponse tokens) {
        return new LoginResponse(false, null, tokens);
    }
}
