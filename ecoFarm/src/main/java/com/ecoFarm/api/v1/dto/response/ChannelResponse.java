package com.ecoFarm.api.v1.dto.response;

import java.util.UUID;

public record ChannelResponse(
    UUID deviceId,
    String deviceName,
    UUID siteId,
    String siteName,
    String dataPointKey,
    String label,
    String unit
) {}
