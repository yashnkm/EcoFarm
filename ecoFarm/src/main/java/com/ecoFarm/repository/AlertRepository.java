package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Alert;
import com.ecoFarm.domain.enums.AlertStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {

    Page<Alert> findByTenantId(UUID tenantId, Pageable pageable);

    List<Alert> findByTenantIdAndStatus(UUID tenantId, AlertStatus status);

    Page<Alert> findByTenantIdAndStatus(UUID tenantId, AlertStatus status, Pageable pageable);

    List<Alert> findByDeviceIdAndStatus(UUID deviceId, AlertStatus status);

    List<Alert> findByAlertRuleIdAndStatusAndTriggeredAtAfter(
        UUID alertRuleId,
        AlertStatus status,
        Instant cutoff
    );

    void deleteByAlertRuleId(UUID alertRuleId);
}
