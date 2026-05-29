package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.ClaimGatewayRequest;
import com.ecoFarm.api.v1.dto.request.RegisterGatewayRequest;
import com.ecoFarm.api.v1.dto.request.UpdateGatewayRequest;
import com.ecoFarm.api.v1.dto.response.GatewayResponse;
import com.ecoFarm.api.v1.mapper.GatewayMapper;
import com.ecoFarm.service.GatewayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gateways")
@RequiredArgsConstructor
public class GatewayController {

    private final GatewayService service;
    private final GatewayMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<GatewayResponse> list() {
        return service.listForCurrentTenant().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/unregistered")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public List<GatewayResponse> listUnregistered() {
        return service.listUnregistered().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public GatewayResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findInTenant(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<GatewayResponse> register(@Valid @RequestBody RegisterGatewayRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.register(req)));
    }

    @PostMapping("/{id}/claim")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public GatewayResponse claim(@PathVariable UUID id, @Valid @RequestBody ClaimGatewayRequest req) {
        return mapper.toResponse(service.claim(id, req));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public GatewayResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateGatewayRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
