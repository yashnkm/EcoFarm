package com.ecoFarm.api.v1.dto.request;

import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.domain.enums.UserStatus;

public record UpdateUserRequest(
    String firstName,
    String lastName,
    Role role,
    UserStatus status
) {}
