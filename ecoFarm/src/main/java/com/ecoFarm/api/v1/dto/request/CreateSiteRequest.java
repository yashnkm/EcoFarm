package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateSiteRequest(
    @NotBlank @Size(max = 255) String name,
    String address,
    BigDecimal lat,
    BigDecimal lng,
    String timezone
) {}
