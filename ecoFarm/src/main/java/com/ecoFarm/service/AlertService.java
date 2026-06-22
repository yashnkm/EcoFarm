package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateAlertRuleRequest;
import com.ecoFarm.api.v1.dto.request.UpdateAlertRuleRequest;
import com.ecoFarm.domain.entity.Alert;
import com.ecoFarm.domain.entity.AlertRule;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.AlertSeverity;
import com.ecoFarm.domain.enums.AlertStatus;
import com.ecoFarm.repository.AlertRepository;
import com.ecoFarm.repository.AlertRuleRepository;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final DeviceRepository deviceRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    // ── Alert Rules ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AlertRule> listRules() {
        return alertRuleRepository.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional
    public AlertRule createRule(CreateAlertRuleRequest req) {
        UUID tenantId = SecurityUtil.currentTenantId();

        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        Device device = deviceRepository.findByIdAndTenantId(req.deviceId(), tenantId)
            .orElseThrow(() -> ApiException.badRequest("Device not found"));

        User creator = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        AlertRule rule = AlertRule.builder()
            .tenant(tenant)
            .device(device)
            .dataPointKey(req.dataPointKey())
            .name(req.name())
            .condition(req.condition())
            .threshold(req.threshold())
            .severity(req.severity() != null ? req.severity() : AlertSeverity.WARNING)
            .cooldownMinutes(req.cooldownMinutes() != null ? req.cooldownMinutes() : 15)
            .createdBy(creator)
            .build();

        return alertRuleRepository.save(rule);
    }

    @Transactional
    public AlertRule updateRule(UUID id, UpdateAlertRuleRequest req) {
        AlertRule rule = findRuleInTenant(id);

        if (req.name() != null)           rule.setName(req.name());
        if (req.condition() != null)       rule.setCondition(req.condition());
        if (req.threshold() != null)       rule.setThreshold(req.threshold());
        if (req.severity() != null)        rule.setSeverity(req.severity());
        if (req.cooldownMinutes() != null) rule.setCooldownMinutes(req.cooldownMinutes());
        if (req.enabled() != null)         rule.setEnabled(req.enabled());

        return rule;
    }

    @Transactional
    public void deleteRule(UUID id) {
        AlertRule rule = findRuleInTenant(id);
        alertRepository.deleteByAlertRuleId(rule.getId());
        alertRuleRepository.delete(rule);
    }

    // ── Alerts ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<Alert> listAlerts(AlertStatus status, Pageable pageable) {
        UUID tenantId = SecurityUtil.currentTenantId();
        if (status != null) {
            return alertRepository.findByTenantIdAndStatus(tenantId, status, pageable);
        }
        return alertRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional
    public Alert acknowledge(UUID id) {
        Alert alert = findAlertInTenant(id);
        if (alert.getStatus() != AlertStatus.ACTIVE) {
            throw ApiException.badRequest("Only ACTIVE alerts can be acknowledged");
        }

        User actor = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(Instant.now());
        alert.setAcknowledgedBy(actor);
        return alert;
    }

    @Transactional
    public Alert resolve(UUID id) {
        Alert alert = findAlertInTenant(id);
        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw ApiException.badRequest("Alert is already resolved");
        }

        User actor = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(Instant.now());
        alert.setResolvedBy(actor);
        return alert;
    }

    // ── Helpers ────────────────────────────────────────────────────

    private AlertRule findRuleInTenant(UUID id) {
        AlertRule rule = alertRuleRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Alert rule not found"));
        if (!rule.getTenant().getId().equals(SecurityUtil.currentTenantId())) {
            throw ApiException.forbidden("Access denied");
        }
        return rule;
    }

    private Alert findAlertInTenant(UUID id) {
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Alert not found"));
        if (!alert.getTenant().getId().equals(SecurityUtil.currentTenantId())) {
            throw ApiException.forbidden("Access denied");
        }
        return alert;
    }
}
