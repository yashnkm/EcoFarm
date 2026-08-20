package com.ecoFarm.api.v1.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

/** The full ordered list of device IDs as the user wants them to appear —
 * position in the list becomes each device's new sortOrder (0-based). */
public record ReorderDevicesRequest(
    @NotEmpty List<UUID> deviceIds
) {}
