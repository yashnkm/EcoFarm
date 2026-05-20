package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRuleRepository extends JpaRepository<AlertRule, UUID> {

    List<AlertRule> findByTenantId(UUID tenantId);

    List<AlertRule> findByDeviceId(UUID deviceId);

    List<AlertRule> findByDeviceIdAndEnabledTrue(UUID deviceId);

    List<AlertRule> findByDeviceIdAndDataPointKeyAndEnabledTrue(UUID deviceId, String dataPointKey);
}
