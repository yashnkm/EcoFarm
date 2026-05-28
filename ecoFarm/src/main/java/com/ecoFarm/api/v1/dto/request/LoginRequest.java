package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String slug,
    @NotBlank @Email String email,
    @NotBlank String password
) {}
