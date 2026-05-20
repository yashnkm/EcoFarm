package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.Reading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReadingRepository extends JpaRepository<Reading, Reading.ReadingId> {

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
}
