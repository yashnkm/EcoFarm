package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateTenantRequest;
import com.ecoFarm.api.v1.dto.request.UpdateTenantRequest;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;
import com.ecoFarm.repository.MqttBrokerRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
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
    private final MqttBrokerRepository brokerRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantCleanupService cleanupService;

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

        MqttBroker broker = req.mqttBrokerId() != null
            ? brokerRepository.findById(req.mqttBrokerId())
                .orElseThrow(() -> ApiException.badRequest("MQTT broker not found"))
            : null;

        Tenant tenant = tenantRepository.save(Tenant.builder()
            .name(req.name())
            .slug(req.slug())
            .mqttBroker(broker)
            .build());

        User admin = User.builder()
            .tenant(tenant)
            .email(req.adminEmail())
            .passwordHash(passwordEncoder.encode(req.adminPassword()))
            .role(Role.TENANT_ADMIN)
            .firstName(req.adminFirstName())
            .lastName(req.adminLastName())
            .status(UserStatus.ACTIVE)
            .activatedAt(Instant.now())
            .build();
        userRepository.save(admin);

        return tenant;
    }

    @Transactional
    public Tenant update(UUID id, UpdateTenantRequest req) {
        Tenant tenant = findById(id);
        if (req.name() != null)   tenant.setName(req.name());
        if (req.status() != null) tenant.setStatus(req.status());
        if (req.plan() != null)   tenant.setPlan(req.plan());
        if (req.mqttBrokerId() != null) {
            MqttBroker broker = brokerRepository.findById(req.mqttBrokerId())
                .orElseThrow(() -> ApiException.badRequest("MQTT broker not found"));
            tenant.setMqttBroker(broker);
        }
        return tenant;
    }

    @Transactional
    public void delete(UUID id) {
        Tenant tenant = findById(id);
        cleanupService.purgeTenantData(tenant.getId());
        tenantRepository.delete(tenant);
    }
}
