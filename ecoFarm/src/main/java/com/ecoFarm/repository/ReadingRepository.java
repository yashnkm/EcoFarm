package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Reading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReadingRepository extends JpaRepository<Reading, Reading.ReadingId> {

    /**
     * Single latest reading for a device + data point — used to resolve a
     * toggle command's current on/off state before flipping it.
     */
    Optional<Reading> findFirstByDeviceIdAndDataPointOrderByTimeDesc(UUID deviceId, String dataPoint);

    /**
     * Range query — historical readings for a device + data point.
     */
    @Query("""
        SELECT r FROM Reading r
        WHERE r.deviceId = :deviceId
          AND r.dataPoint = :dataPoint
          AND r.time BETWEEN :from AND :to
        ORDER BY r.time ASC
    """)
    List<Reading> findRange(
        @Param("deviceId") UUID deviceId,
        @Param("dataPoint") String dataPoint,
        @Param("from") Instant from,
        @Param("to") Instant to
    );

    /**
     * Latest reading per data point for a single device.
     * Uses PostgreSQL DISTINCT ON — returns one row per data_point, ordered by time DESC.
     */
    @Query(value = """
        SELECT DISTINCT ON (data_point) *
        FROM readings
        WHERE device_id = :deviceId
        ORDER BY data_point, time DESC
    """, nativeQuery = true)
    List<Reading> findLatestPerDataPoint(@Param("deviceId") UUID deviceId);

    /**
     * Latest readings for all devices at a site.
     */
    @Query(value = """
        SELECT DISTINCT ON (device_id, data_point) *
        FROM readings
        WHERE site_id = :siteId
        ORDER BY device_id, data_point, time DESC
    """, nativeQuery = true)
    List<Reading> findLatestForSite(@Param("siteId") UUID siteId);

    /**
     * Latest readings for every device in a tenant — used to seed the live dashboard
     * with last-known values on first load, before WebSocket pushes arrive.
     */
    @Query(value = """
        SELECT DISTINCT ON (device_id, data_point) *
        FROM readings
        WHERE tenant_id = :tenantId
        ORDER BY device_id, data_point, time DESC
    """, nativeQuery = true)
    List<Reading> findLatestForTenant(@Param("tenantId") UUID tenantId);

    /**
     * Bulk-deletes old readings for one device+data point — used by the
     * nightly retention cleanup. A plain @Modifying query so Postgres does
     * the deletion directly instead of Hibernate loading every row as an
     * entity first, which matters once a device+key has months of history.
     */
    @Modifying
    @Query("DELETE FROM Reading r WHERE r.deviceId = :deviceId AND r.dataPoint = :dataPoint AND r.time < :cutoff")
    int deleteOlderThan(
        @Param("deviceId") UUID deviceId,
        @Param("dataPoint") String dataPoint,
        @Param("cutoff") Instant cutoff
    );
}
