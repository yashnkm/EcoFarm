package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {

    List<Device> findByTenantId(UUID tenantId);

    List<Device> findByGatewayId(UUID gatewayId);

    List<Device> findBySiteId(UUID siteId);

    Optional<Device> findByGatewayIdAndSlaveId(UUID gatewayId, Integer slaveId);

    Optional<Device> findByIdAndTenantId(UUID id, UUID tenantId);
}
