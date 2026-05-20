package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateTenantRequest;
import com.ecoFarm.api.v1.dto.request.UpdateTenantRequest;
import com.ecoFarm.api.v1.dto.response.TenantResponse;
import com.ecoFarm.api.v1.mapper.TenantMapper;
import com.ecoFarm.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/tenants")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final TenantMapper mapper;

    @GetMapping
    public List<TenantResponse> list() {
        return tenantService.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public TenantResponse get(@PathVariable UUID id) {
        return mapper.toResponse(tenantService.findById(id));
    }

    @PostMapping
    public ResponseEntity<TenantResponse> create(@Valid @RequestBody CreateTenantRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(tenantService.create(req)));
    }

    @PatchMapping("/{id}")
    public TenantResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateTenantRequest req) {
        return mapper.toResponse(tenantService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tenantService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
