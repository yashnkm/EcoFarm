package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateTenantRequest(
    @NotBlank @Size(max = 255) String name,

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must be lowercase alphanumeric with hyphens")
    String slug,

    @NotBlank @Email String adminEmail,

    @NotBlank @Size(min = 8, max = 128) String adminPassword,

    String adminFirstName,
    String adminLastName,

    /** Optional — which MQTT broker this tenant's gateways route through. */
    UUID mqttBrokerId
) {}
