package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.CommunicationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface CommunicationLogRepository extends JpaRepository<CommunicationLog, UUID> {

    Page<CommunicationLog> findByGatewayIdOrderByCreatedAtDesc(UUID gatewayId, Pageable pageable);

    Page<CommunicationLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId, Pageable pageable);

    /** Bulk delete straight in Postgres — this table gets a row per poll
     * request and per response, so it can hold tens of millions of rows and
     * must not be loaded into Hibernate to be removed. */
    @Modifying
    @Query("DELETE FROM CommunicationLog c WHERE c.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
