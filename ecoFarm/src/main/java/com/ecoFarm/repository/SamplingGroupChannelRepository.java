package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.SamplingGroupChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SamplingGroupChannelRepository extends JpaRepository<SamplingGroupChannel, UUID> {

    // A channel belongs to at most one group (enforced by a unique
    // constraint on device_id+data_point_key, not scoped to a group) — so
    // this is always at most one row.
    Optional<SamplingGroupChannel> findByDevice_IdAndDataPointKey(UUID deviceId, String dataPointKey);

    List<SamplingGroupChannel> findBySamplingGroup_TenantId(UUID tenantId);
}
