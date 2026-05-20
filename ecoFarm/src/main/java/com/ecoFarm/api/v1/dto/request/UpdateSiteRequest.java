package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.SiteStatus;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateSiteRequest(
    @Size(max = 255) String name,
    String address,
    BigDecimal lat,
    BigDecimal lng,
    String timezone,
    SiteStatus status
) {}
