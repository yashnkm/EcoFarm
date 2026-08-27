package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.DataPointRequest;
import com.ecoFarm.api.v1.dto.response.DataPointResponse;
import com.ecoFarm.api.v1.mapper.DataPointMapper;
import com.ecoFarm.service.DataPointService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-profiles/{profileId}/data-points")
@RequiredArgsConstructor
public class DataPointController {

    private final DataPointService service;
    private final DataPointMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<DataPointResponse> list(@PathVariable UUID profileId) {
        return service.list(profileId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public DataPointResponse get(@PathVariable UUID profileId, @PathVariable UUID id) {
        return mapper.toResponse(service.findInProfile(profileId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<DataPointResponse> create(@PathVariable UUID profileId,
                                                    @Valid @RequestBody DataPointRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(profileId, req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DataPointResponse update(@PathVariable UUID profileId,
                                    @PathVariable UUID id,
                                    @Valid @RequestBody DataPointRequest req) {
        return mapper.toResponse(service.update(profileId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID profileId, @PathVariable UUID id) {
        service.delete(profileId, id);
        return ResponseEntity.noContent().build();
    }
}
