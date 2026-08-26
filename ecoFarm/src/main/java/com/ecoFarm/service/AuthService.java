package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.ForgotPasswordRequest;
import com.ecoFarm.api.v1.dto.request.LoginRequest;
import com.ecoFarm.api.v1.dto.request.RefreshTokenRequest;
import com.ecoFarm.api.v1.dto.request.ResetPasswordRequest;
import com.ecoFarm.api.v1.dto.response.LoginResponse;
import com.ecoFarm.api.v1.dto.response.TokenResponse;
import com.ecoFarm.config.JwtProperties;
import com.ecoFarm.domain.entity.PasswordResetToken;
import com.ecoFarm.domain.entity.RefreshToken;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;
import com.ecoFarm.repository.PasswordResetTokenRepository;
import com.ecoFarm.repository.RefreshTokenRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.security.JwtUtil;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;
    private final EmailService emailService;
    private final TempPasswordGenerator tempPasswordGenerator;

    @Value("${app.frontend.login-url}")
    private String loginUrl;

    private static final long RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

    @Transactional
    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw ApiException.forbidden("Account is not active");
        }

        // Correct one-time invite password, or a temp password just mailed
        // by a "forgot password" request — never issue real access from
        // here. The client must go set a real password first; every login
        // attempt with the temp password lands back here, not the dashboard.
        if (user.getStatus() == UserStatus.INVITED || user.isMustResetPassword()) {
            return LoginResponse.mustSetPassword(issuePasswordResetToken(user));
        }

        if (user.getRole() == Role.SUPER_ADMIN && !req.adminPortal()) {
            throw ApiException.forbidden("Super admin must sign in via the admin portal");
        }

        if (user.getRole() != Role.SUPER_ADMIN && req.adminPortal()) {
            throw ApiException.forbidden("Access denied");
        }

        Tenant activeTenant;
        if (req.slug() == null || req.slug().isBlank()) {
            // No slug — use the user's own tenant
            activeTenant = user.getTenant();
        } else {
            activeTenant = tenantRepository.findBySlug(req.slug())
                .orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));
            // Non-super-admins can only log into their own tenant
            if (user.getRole() != Role.SUPER_ADMIN
                    && !user.getTenant().getId().equals(activeTenant.getId())) {
                throw ApiException.unauthorized("Invalid credentials");
            }
        }

        return LoginResponse.success(issueTokens(user, activeTenant));
    }

    /** Completes a password-reset token — used both for the forced
     * first-login change and (once built) a "forgot password" flow. Signs
     * the user straight in afterward, same as any product that doesn't make
     * you log in twice after setting a new password. */
    @Transactional
    public TokenResponse resetPassword(ResetPasswordRequest req) {
        String hash = jwtUtil.hashToken(req.token());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));

        if (resetToken.getUsedAt() != null) {
            throw ApiException.badRequest("Invalid or expired token");
        }
        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("Invalid or expired token");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        if (user.getStatus() == UserStatus.INVITED) {
            user.setStatus(UserStatus.ACTIVE);
            user.setActivatedAt(Instant.now());
        }
        user.setMustResetPassword(false);
        resetToken.setUsedAt(Instant.now());
        refreshTokenRepository.revokeAllForUser(user.getId());

        return issueTokens(user, user.getTenant());
    }

    /** Mails a fresh one-time temp password, same mechanism as inviting a
     * user — the client must sign in with it and set a real password before
     * anything else works. Always succeeds from the caller's point of view
     * regardless of whether the email matches an account, so this endpoint
     * can't be used to test which emails have accounts. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        userRepository.findByEmail(req.email()).ifPresent(user -> {
            if (user.getStatus() == UserStatus.SUSPENDED) {
                log.info("Forgot-password requested for suspended account {} — ignoring", user.getEmail());
                return;
            }

            String tempPassword = tempPasswordGenerator.generate();
            user.setPasswordHash(passwordEncoder.encode(tempPassword));
            user.setMustResetPassword(true);
            refreshTokenRepository.revokeAllForUser(user.getId());

            emailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), tempPassword, loginUrl);
        });
    }

    private String issuePasswordResetToken(User user) {
        String raw = jwtUtil.generateRefreshToken();
        passwordResetTokenRepository.save(PasswordResetToken.builder()
            .user(user)
            .tokenHash(jwtUtil.hashToken(raw))
            .expiresAt(Instant.now().plusMillis(RESET_TOKEN_TTL_MS))
            .build());
        return raw;
    }

    @Transactional
    public TokenResponse refresh(RefreshTokenRequest req) {
        String hash = jwtUtil.hashToken(req.refreshToken());

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));

        if (stored.getRevokedAt() != null) {
            throw ApiException.unauthorized("Refresh token revoked");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("Refresh token expired");
        }

        stored.setRevokedAt(Instant.now());

        // Preserve the tenant context from the original login; fall back to own tenant for old tokens
        Tenant activeTenant = stored.getActiveTenant() != null
            ? stored.getActiveTenant()
            : stored.getUser().getTenant();

        return issueTokens(stored.getUser(), activeTenant);
    }

    @Transactional
    public void logout(RefreshTokenRequest req) {
        String hash = jwtUtil.hashToken(req.refreshToken());
        refreshTokenRepository.findByTokenHash(hash).ifPresent(t -> t.setRevokedAt(Instant.now()));
    }

    @Transactional
    public TokenResponse switchTenant(String slug, String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> ApiException.unauthorized("User not found"));
        Tenant tenant = tenantRepository.findBySlug(slug)
            .orElseThrow(() -> ApiException.badRequest("Organisation not found"));
        return issueTokens(user, tenant);
    }

    private TokenResponse issueTokens(User user, Tenant activeTenant) {
        String accessToken = jwtUtil.generateAccessToken(user, activeTenant);
        String refreshTokenRaw = jwtUtil.generateRefreshToken();

        RefreshToken rt = RefreshToken.builder()
            .user(user)
            .activeTenant(activeTenant)
            .tokenHash(jwtUtil.hashToken(refreshTokenRaw))
            .expiresAt(Instant.now().plusMillis(jwtUtil.getRefreshExpiryMs()))
            .build();
        refreshTokenRepository.save(rt);

        return new TokenResponse(
            accessToken,
            refreshTokenRaw,
            jwtProperties.getExpiryMs() / 1000,
            new TokenResponse.UserSummary(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                activeTenant.getId(),
                activeTenant.getName(),
                activeTenant.getSlug()
            )
        );
    }
}
