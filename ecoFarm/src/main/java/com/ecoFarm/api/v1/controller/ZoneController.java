package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateZoneRequest;
import com.ecoFarm.api.v1.dto.request.UpdateZoneRequest;
import com.ecoFarm.api.v1.dto.response.ZoneResponse;
import com.ecoFarm.api.v1.mapper.ZoneMapper;
import com.ecoFarm.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sites/{siteId}/zones")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;
    private final ZoneMapper mapper;

    @GetMapping
    public List<ZoneResponse> list(@PathVariable UUID siteId) {
        return zoneService.listForSite(siteId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ZoneResponse get(@PathVariable UUID siteId, @PathVariable UUID id) {
        return mapper.toResponse(zoneService.findInSite(siteId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<ZoneResponse> create(@PathVariable UUID siteId,
                                               @Valid @RequestBody CreateZoneRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(zoneService.create(siteId, req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ZoneResponse update(@PathVariable UUID siteId,
                               @PathVariable UUID id,
                               @Valid @RequestBody UpdateZoneRequest req) {
        return mapper.toResponse(zoneService.update(siteId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID siteId, @PathVariable UUID id) {
        zoneService.delete(siteId, id);
        return ResponseEntity.noContent().build();
    }
}
