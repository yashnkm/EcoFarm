package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.SamplingGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SamplingGroupRepository extends JpaRepository<SamplingGroup, UUID> {

    List<SamplingGroup> findByTenantId(UUID tenantId);

    Optional<SamplingGroup> findByIdAndTenantId(UUID id, UUID tenantId);
}
