package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.CommunicationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommunicationLogRepository extends JpaRepository<CommunicationLog, UUID> {

    Page<CommunicationLog> findByGatewayIdOrderByCreatedAtDesc(UUID gatewayId, Pageable pageable);

    Page<CommunicationLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId, Pageable pageable);
}
