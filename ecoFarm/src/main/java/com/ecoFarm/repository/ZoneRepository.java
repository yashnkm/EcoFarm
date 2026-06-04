package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, UUID> {

    List<Zone> findBySiteId(UUID siteId);

    @Query("SELECT z FROM Zone z WHERE z.site.tenant.id = :tenantId ORDER BY z.site.name, z.name")
    List<Zone> findByTenantId(@Param("tenantId") UUID tenantId);
}
