package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.DeviceProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeviceProfileRepository extends JpaRepository<DeviceProfile, UUID> {

    /**
     * Returns both global (tenant_id IS NULL) profiles and tenant-specific ones.
     */
    @Query("SELECT p FROM DeviceProfile p WHERE p.tenant IS NULL OR p.tenant.id = :tenantId")
    List<DeviceProfile> findAllAvailableForTenant(@Param("tenantId") UUID tenantId);
}
