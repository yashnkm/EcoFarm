package com.ecoFarm.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Hard-deletes all data belonging to a tenant, in dependency order.
 * Required because the JPA-generated schema doesn't have ON DELETE CASCADE
 * on most FK constraints.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantCleanupService {

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public void purgeTenantData(UUID tenantId) {
        log.info("Purging all data for tenant {}", tenantId);

        // ── 1. Auth tokens for users in this tenant ──
        execute("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM invitation_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)", tenantId);

        // ── 2. Time-series & operational data ──
        execute("DELETE FROM readings WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM alerts WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM alert_rules WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM control_commands WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM notifications WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM audit_logs WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM communication_logs WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM system_event_logs WHERE tenant_id = :tid", tenantId);

        // ── 3. Devices → Gateways → Zones → Sites ──
        execute("DELETE FROM devices WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM gateways WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM zones WHERE site_id IN (SELECT id FROM sites WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM sites WHERE tenant_id = :tid", tenantId);

        // ── 4. Tenant-scoped device profiles ──
        execute("DELETE FROM command_templates WHERE profile_id IN (SELECT id FROM device_profiles WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM data_points WHERE profile_id IN (SELECT id FROM device_profiles WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM poll_groups WHERE profile_id IN (SELECT id FROM device_profiles WHERE tenant_id = :tid)", tenantId);
        execute("DELETE FROM device_profiles WHERE tenant_id = :tid", tenantId);

        // ── 5. Users (must come last — other tables reference them via audit_logs etc., but those are purged above) ──
        // Break any self-referential invited_by links first
        execute("UPDATE users SET invited_by = NULL WHERE tenant_id = :tid", tenantId);
        execute("DELETE FROM users WHERE tenant_id = :tid", tenantId);

        log.info("Completed purge for tenant {}", tenantId);
    }

    private void execute(String sql, UUID tenantId) {
        int count = em.createNativeQuery(sql)
            .setParameter("tid", tenantId)
            .executeUpdate();
        if (count > 0) log.debug("  {} → {} rows", sql.substring(7, Math.min(50, sql.length())), count);
    }
}
