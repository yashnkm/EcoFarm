package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateDeviceProfileRequest;
import com.ecoFarm.api.v1.dto.request.UpdateDeviceProfileRequest;
import com.ecoFarm.api.v1.dto.response.DeviceProfileResponse;
import com.ecoFarm.api.v1.mapper.DeviceProfileMapper;
import com.ecoFarm.service.DeviceProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-profiles")
@RequiredArgsConstructor
public class DeviceProfileController {

    private final DeviceProfileService service;
    private final DeviceProfileMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<DeviceProfileResponse> list() {
        return service.listAvailable().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public DeviceProfileResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findAvailable(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<DeviceProfileResponse> create(@Valid @RequestBody CreateDeviceProfileRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceProfileResponse update(@PathVariable UUID id,
                                        @Valid @RequestBody UpdateDeviceProfileRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
