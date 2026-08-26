package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.ForgotPasswordRequest;
import com.ecoFarm.api.v1.dto.request.LoginRequest;
import com.ecoFarm.api.v1.dto.request.RefreshTokenRequest;
import com.ecoFarm.api.v1.dto.request.ResetPasswordRequest;
import com.ecoFarm.api.v1.dto.response.LoginResponse;
import com.ecoFarm.api.v1.dto.response.TokenResponse;
import com.ecoFarm.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    /** Mails a fresh temp password if the address has an account — always
     * responds 204 either way so this can't be used to enumerate accounts. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.noContent().build();
    }

    /** Completes a one-time-use PasswordResetToken (from a forced first
     * login, or eventually a "forgot password" request) and signs the user
     * straight in. No prior authentication needed — the token itself is the
     * proof of identity. */
    @PostMapping("/set-password")
    public ResponseEntity<TokenResponse> setPassword(@Valid @RequestBody ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refresh(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest req) {
        authService.logout(req);
        return ResponseEntity.noContent().build();
    }
}
