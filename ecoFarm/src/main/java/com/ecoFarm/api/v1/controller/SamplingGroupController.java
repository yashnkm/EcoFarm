package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.SamplingGroupRequest;
import com.ecoFarm.api.v1.dto.response.SamplingGroupResponse;
import com.ecoFarm.api.v1.mapper.SamplingGroupMapper;
import com.ecoFarm.service.SamplingGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sampling-groups")
@RequiredArgsConstructor
public class SamplingGroupController {

    private final SamplingGroupService service;
    private final SamplingGroupMapper mapper;

    @GetMapping
    public List<SamplingGroupResponse> list() {
        return service.list().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public SamplingGroupResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findInTenant(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<SamplingGroupResponse> create(@Valid @RequestBody SamplingGroupRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public SamplingGroupResponse update(@PathVariable UUID id, @Valid @RequestBody SamplingGroupRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
