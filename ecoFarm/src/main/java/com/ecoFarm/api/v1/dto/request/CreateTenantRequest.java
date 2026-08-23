package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTenantRequest(
    @NotBlank @Size(max = 255) String name,

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must be lowercase alphanumeric with hyphens")
    String slug,

    @NotBlank @Email String adminEmail,

    String adminFirstName,
    String adminLastName
) {}
