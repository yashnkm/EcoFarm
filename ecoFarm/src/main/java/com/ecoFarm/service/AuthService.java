package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.LoginRequest;
import com.ecoFarm.api.v1.dto.request.RefreshTokenRequest;
import com.ecoFarm.api.v1.dto.response.TokenResponse;
import com.ecoFarm.config.JwtProperties;
import com.ecoFarm.domain.entity.RefreshToken;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.RefreshTokenRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.security.JwtUtil;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;

    @Transactional
    public TokenResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials");
        }

        if (user.getStatus() != com.ecoFarm.domain.enums.UserStatus.ACTIVE) {
            throw ApiException.forbidden("Account is not active");
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

        return issueTokens(user, activeTenant);
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
