package com.ecoFarm.api.v1.dto.response;

import java.time.Instant;

/** One bucket from an aggregated readings query (see
 * ReadingController#aggregate) — the average/min/max/count of every raw
 * reading whose timestamp fell into this bucket. */
public record ReadingBucketResponse(
    Instant bucketStart,
    Double avgValue,
    Double minValue,
    Double maxValue,
    Long count
) {}
