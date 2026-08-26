package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.ChangeEmailRequest;
import com.ecoFarm.api.v1.dto.request.ChangePasswordRequest;
import com.ecoFarm.api.v1.dto.request.CreateUserRequest;
import com.ecoFarm.api.v1.dto.request.UpdateProfileRequest;
import com.ecoFarm.api.v1.dto.request.UpdateUserRequest;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;
import com.ecoFarm.repository.RefreshTokenRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TempPasswordGenerator tempPasswordGenerator;

    @Value("${app.frontend.login-url}")
    private String loginUrl;

    @Transactional(readOnly = true)
    public List<User> listForCurrentTenant() {
        return userRepository.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public User findInTenant(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("User not found"));
        if (!user.getTenant().getId().equals(SecurityUtil.currentTenantId())) {
            throw ApiException.notFound("User not found");
        }
        return user;
    }

    @Transactional
    public User create(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw ApiException.conflict("Email already in use");
        }
        if (req.role() == Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Cannot create super admins via this endpoint");
        }

        Tenant tenant = tenantRepository.findById(SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        User invitedBy = SecurityUtil.currentUser();
        String tempPassword = tempPasswordGenerator.generate();

        User user = User.builder()
            .tenant(tenant)
            .email(req.email())
            .passwordHash(passwordEncoder.encode(tempPassword))
            .role(req.role())
            .firstName(req.firstName())
            .lastName(req.lastName())
            .status(UserStatus.INVITED)
            .invitedBy(invitedBy)
            .invitedAt(Instant.now())
            .build();

        user = userRepository.save(user);

        emailService.sendWelcomeEmail(
            user.getEmail(),
            user.getFirstName(),
            tenant.getName(),
            user.getRole().name(),
            user.getEmail(),
            tempPassword,
            loginUrl
        );

        return user;
    }

    @Transactional
    public User update(UUID id, UpdateUserRequest req) {
        User user = findInTenant(id);
        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName() != null)  user.setLastName(req.lastName());
        if (req.role() != null) {
            if (req.role() == Role.SUPER_ADMIN) {
                throw ApiException.forbidden("Cannot assign super admin");
            }
            user.setRole(req.role());
        }
        if (req.status() != null) user.setStatus(req.status());
        return user;
    }

    @Transactional
    public void delete(UUID id) {
        User user = findInTenant(id);
        if (user.getId().equals(SecurityUtil.currentUserId())) {
            throw ApiException.badRequest("You cannot delete yourself");
        }
        refreshTokenRepository.revokeAllForUser(user.getId());
        userRepository.delete(user);
    }

    @Transactional
    public User updateProfile(UpdateProfileRequest req) {
        User user = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));
        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName() != null)  user.setLastName(req.lastName());
        return user;
    }

    @Transactional
    public void changePassword(ChangePasswordRequest req) {
        User user = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setMustResetPassword(false);
        refreshTokenRepository.revokeAllForUser(user.getId());
    }

    /** Self-service email change — requires the current password as proof
     * of identity, same bar as changing the password itself. Revokes all
     * sessions afterward: the JWT auth filter looks the user up by the
     * email baked into the access token, so a stale token would otherwise
     * fail to authenticate at all on the very next request. */
    @Transactional
    public void changeEmail(ChangeEmailRequest req) {
        User user = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }

        String newEmail = req.newEmail().trim();
        if (newEmail.equals(user.getEmail())) {
            throw ApiException.badRequest("That's already your email");
        }
        if (userRepository.existsByEmail(newEmail)) {
            throw ApiException.conflict("Email already in use");
        }

        user.setEmail(newEmail);
        refreshTokenRepository.revokeAllForUser(user.getId());
    }

    @Transactional(readOnly = true)
    public User currentUser() {
        return userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
