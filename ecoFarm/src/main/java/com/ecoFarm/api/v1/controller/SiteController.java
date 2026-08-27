package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateSiteRequest;
import com.ecoFarm.api.v1.dto.request.UpdateSiteRequest;
import com.ecoFarm.api.v1.dto.response.SiteResponse;
import com.ecoFarm.api.v1.mapper.SiteMapper;
import com.ecoFarm.service.SiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sites")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;
    private final SiteMapper mapper;

    @GetMapping
    public List<SiteResponse> list() {
        return siteService.listForCurrentTenant().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public SiteResponse get(@PathVariable UUID id) {
        return mapper.toResponse(siteService.findInTenant(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<SiteResponse> create(@Valid @RequestBody CreateSiteRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(siteService.create(req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public SiteResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSiteRequest req) {
        return mapper.toResponse(siteService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        siteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
