package com.ecoFarm.repository;

/** Row shape returned by ReadingRepository#aggregateRange's native query —
 * Spring Data matches these getters to the query's column aliases.
 *
 * bucketStart is deliberately epoch milliseconds (a plain number), not an
 * Instant/Timestamp: reading a native query's timestamptz column back as
 * Instant goes through a JVM-default-timezone-dependent conversion path in
 * Hibernate/pgjdbc, which silently shifted every bucket by 30 minutes on a
 * server whose JVM default timezone is Asia/Kolkata (UTC+5:30) — caught by
 * testing against known values, not visible from the SQL alone (a direct
 * psql query showed correct date_trunc() output; only the JDBC read-back
 * was wrong). Epoch millis has no timezone to get wrong. */
public interface ReadingBucketProjection {
    Long getBucketStartMs();
    Double getAvgValue();
    Double getMinValue();
    Double getMaxValue();
    Long getCnt();
}
