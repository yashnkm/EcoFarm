package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SiteRepository extends JpaRepository<Site, UUID> {

    List<Site> findByTenantId(UUID tenantId);

    Optional<Site> findByIdAndTenantId(UUID id, UUID tenantId);
}
