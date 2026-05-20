package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.SystemEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SystemEventLogRepository extends JpaRepository<SystemEventLog, UUID> {

    Page<SystemEventLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
