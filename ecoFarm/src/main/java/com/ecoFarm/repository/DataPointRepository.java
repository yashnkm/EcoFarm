package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.DataPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DataPointRepository extends JpaRepository<DataPoint, UUID> {

    List<DataPoint> findByProfileId(UUID profileId);

    List<DataPoint> findByPollGroupId(UUID pollGroupId);

    Optional<DataPoint> findByProfileIdAndKey(UUID profileId, String key);
}
