package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CommandGroupsRequest;
import com.ecoFarm.api.v1.dto.request.CreateDeviceRequest;
import com.ecoFarm.api.v1.dto.request.DataPointGroupsRequest;
import com.ecoFarm.api.v1.dto.request.IssueCommandRequest;
import com.ecoFarm.api.v1.dto.request.RecordedDataPointsRequest;
import com.ecoFarm.api.v1.dto.request.UpdateDeviceRequest;
import com.ecoFarm.api.v1.dto.response.ControlCommandResponse;
import com.ecoFarm.api.v1.dto.response.DeviceResponse;
import com.ecoFarm.api.v1.mapper.DeviceMapper;
import com.ecoFarm.service.DeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService service;
    private final DeviceMapper mapper;

    @GetMapping
    public List<DeviceResponse> list(@RequestParam(required = false) UUID gatewayId) {
        var devices = gatewayId != null
            ? service.listForGateway(gatewayId)
            : service.listForCurrentTenant();
        return devices.stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public DeviceResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findInTenant(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<DeviceResponse> create(@Valid @RequestBody CreateDeviceRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateDeviceRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/recorded-data-points")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceResponse updateRecordedDataPoints(
        @PathVariable UUID id,
        @Valid @RequestBody RecordedDataPointsRequest req) {
        return mapper.toResponse(service.updateRecordedDataPoints(id, req));
    }

    @PatchMapping("/{id}/data-point-groups")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceResponse updateDataPointGroups(
        @PathVariable UUID id,
        @Valid @RequestBody DataPointGroupsRequest req) {
        return mapper.toResponse(service.updateDataPointGroups(id, req));
    }

    @PatchMapping("/{id}/command-groups")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceResponse updateCommandGroups(
        @PathVariable UUID id,
        @Valid @RequestBody CommandGroupsRequest req) {
        return mapper.toResponse(service.updateCommandGroups(id, req));
    }

    @PostMapping("/{id}/commands")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public ResponseEntity<ControlCommandResponse> issueCommand(
        @PathVariable UUID id,
        @Valid @RequestBody IssueCommandRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.issueCommand(id, req)));
    }

    @GetMapping("/{id}/commands")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<ControlCommandResponse> listCommands(@PathVariable UUID id) {
        return service.listCommands(id).stream().map(mapper::toResponse).toList();
    }
}
