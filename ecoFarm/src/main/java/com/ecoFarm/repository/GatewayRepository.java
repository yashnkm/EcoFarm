package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.enums.GatewayStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GatewayRepository extends JpaRepository<Gateway, UUID> {

    Optional<Gateway> findBySerialNumber(String serialNumber);

    Optional<Gateway> findByMqttClientId(String mqttClientId);

    List<Gateway> findByTenantId(UUID tenantId);

    List<Gateway> findByStatus(GatewayStatus status);

    Optional<Gateway> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByMqttBrokerId(UUID mqttBrokerId);
}
