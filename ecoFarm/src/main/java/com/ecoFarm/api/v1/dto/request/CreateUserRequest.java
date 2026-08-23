package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** No password field — the server generates a one-time invite password and
 * emails it, rather than the admin choosing (and having to separately
 * relay) one. See UserService.create(). */
public record CreateUserRequest(
    @NotBlank @Email String email,
    @NotNull Role role,
    String firstName,
    String lastName
) {}
