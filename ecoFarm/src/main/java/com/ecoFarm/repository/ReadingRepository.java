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
     * Bucketed aggregation (avg/min/max/count) for a device + data point
     * over a range — backs Hourly/Daily/Weekly resolution views, where
     * fetching every raw row would be wasteful or, for long ranges,
     * outright too much to return at all. unit is a Postgres date_trunc
     * field name ("hour", "day", or "week") — bound as a query parameter
     * rather than concatenated, so this isn't a SQL-injection surface
     * despite being a "field name" value.
     */
    // Two things had to be right here, both found by testing against known
    // values rather than reading the SQL alone:
    //
    // 1. date_trunc(field, timestamptz) truncates in the DB SESSION's
    //    timezone, not UTC — and pgjdbc sets each session's timezone to
    //    match the JVM's default timezone unless told otherwise. On a
    //    Windows dev machine defaulting to Asia/Kolkata that silently
    //    produced IST-aligned buckets; on prod's Linux server (UTC) the
    //    exact same query would produce UTC-aligned buckets instead —
    //    an environment-dependent bug. The explicit 3-argument form,
    //    date_trunc(field, source, 'Asia/Kolkata'), truncates in that
    //    zone regardless of the session's own timezone, which is what's
    //    actually wanted: an Hourly/Daily/Weekly bucket should mean an
    //    IST hour/day/week, matching every other "what day/hour is this"
    //    decision already made elsewhere in this app (see formatIst,
    //    ReadingRetentionService's cron zone).
    //
    // 2. :unit has to appear exactly once — repeating the same named
    //    parameter in SELECT/GROUP BY/ORDER BY makes Postgres bind it as
    //    separate `?` placeholders, which its GROUP BY validation then
    //    treats as structurally different expressions (even though
    //    they'd receive the same value at runtime) and rejects with
    //    "must appear in GROUP BY". The subquery computes the bucket
    //    once; the outer query just groups/orders by that already-
    //    materialized column.
    @Query(value = """
        SELECT bucket,
               extract(epoch FROM bucket)::bigint * 1000 AS bucket_start_ms,
               avg(value) AS avg_value,
               min(value) AS min_value,
               max(value) AS max_value,
               count(*) AS cnt
        FROM (
            SELECT date_trunc(:unit, time, 'Asia/Kolkata') AS bucket, value
            FROM readings
            WHERE device_id = :deviceId AND data_point = :dataPoint AND time BETWEEN :from AND :to
        ) bucketed
        GROUP BY bucket
        ORDER BY bucket ASC
    """, nativeQuery = true)
    List<ReadingBucketProjection> aggregateRange(
        @Param("deviceId") UUID deviceId,
        @Param("dataPoint") String dataPoint,
        @Param("from") Instant from,
        @Param("to") Instant to,
        @Param("unit") String unit
    );

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
