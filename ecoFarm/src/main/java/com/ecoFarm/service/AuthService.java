package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.LoginRequest;
import com.ecoFarm.api.v1.dto.request.RefreshTokenRequest;
import com.ecoFarm.api.v1.dto.response.TokenResponse;
import com.ecoFarm.config.JwtProperties;
import com.ecoFarm.domain.entity.RefreshToken;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.repository.RefreshTokenRepository;
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

        return issueTokens(user);
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

        // Rotate — revoke the old token and issue a new pair
        stored.setRevokedAt(Instant.now());
        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(RefreshTokenRequest req) {
        String hash = jwtUtil.hashToken(req.refreshToken());
        refreshTokenRepository.findByTokenHash(hash).ifPresent(t -> t.setRevokedAt(Instant.now()));
    }

    private TokenResponse issueTokens(User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshTokenRaw = jwtUtil.generateRefreshToken();

        RefreshToken rt = RefreshToken.builder()
            .user(user)
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
                user.getTenant().getId(),
                user.getTenant().getName()
            )
        );
    }
}
