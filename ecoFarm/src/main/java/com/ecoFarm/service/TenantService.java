package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateTenantRequest;
import com.ecoFarm.api.v1.dto.request.UpdateTenantRequest;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;
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
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantCleanupService cleanupService;
    private final EmailService emailService;
    private final TempPasswordGenerator tempPasswordGenerator;

    @Value("${app.frontend.login-url}")
    private String loginUrl;

    @Transactional(readOnly = true)
    public List<Tenant> findAll() {
        return tenantRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Tenant findById(UUID id) {
        return tenantRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));
    }

    @Transactional
    public Tenant create(CreateTenantRequest req) {
        if (tenantRepository.existsBySlug(req.slug())) {
            throw ApiException.conflict("Slug already in use");
        }
        if (userRepository.existsByEmail(req.adminEmail())) {
            throw ApiException.conflict("Admin email already in use");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
            .name(req.name())
            .slug(req.slug())
            .build());

        User invitedBy = SecurityUtil.currentUser();
        String tempPassword = tempPasswordGenerator.generate();

        User admin = User.builder()
            .tenant(tenant)
            .email(req.adminEmail())
            .passwordHash(passwordEncoder.encode(tempPassword))
            .role(Role.TENANT_ADMIN)
            .firstName(req.adminFirstName())
            .lastName(req.adminLastName())
            .status(UserStatus.INVITED)
            .invitedBy(invitedBy)
            .invitedAt(Instant.now())
            .build();
        admin = userRepository.save(admin);

        emailService.sendWelcomeEmail(
            admin.getEmail(),
            admin.getFirstName(),
            tenant.getName(),
            admin.getRole().name(),
            admin.getEmail(),
            tempPassword,
            loginUrl
        );

        return tenant;
    }

    @Transactional
    public Tenant update(UUID id, UpdateTenantRequest req) {
        Tenant tenant = findById(id);
        if (req.name() != null)   tenant.setName(req.name());
        if (req.status() != null) tenant.setStatus(req.status());
        if (req.plan() != null)   tenant.setPlan(req.plan());
        return tenant;
    }

    @Transactional
    public void delete(UUID id) {
        Tenant tenant = findById(id);

        if ("platform".equals(tenant.getSlug())) {
            throw ApiException.badRequest("The platform tenant cannot be deleted");
        }

        if (id.equals(SecurityUtil.currentTenantId())) {
            throw ApiException.badRequest("Cannot delete the tenant you are currently logged into");
        }

        cleanupService.purgeTenantData(tenant.getId());
        tenantRepository.delete(tenant);
    }
}
