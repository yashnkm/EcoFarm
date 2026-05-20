package com.ecoFarm.ingestion;

import com.ecoFarm.domain.enums.ReadingQuality;

import java.time.Instant;
import java.util.UUID;

public record LiveReadingMessage(
    UUID deviceId,
    String dataPoint,
    Double value,
    Integer rawValue,
    ReadingQuality quality,
    String unit,
    Instant time
) {}
