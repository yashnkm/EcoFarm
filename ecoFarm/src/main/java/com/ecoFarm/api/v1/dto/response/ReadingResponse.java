package com.ecoFarm.api.v1.dto.response;

import com.ecoFarm.domain.enums.ReadingQuality;

import java.time.Instant;
import java.util.UUID;

public record ReadingResponse(
    Instant time,
    UUID deviceId,
    String dataPoint,
    Double value,
    Integer rawValue,
    ReadingQuality quality,
    String unit
) {}
