package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateGatewayDriverRequest;
import com.ecoFarm.api.v1.dto.request.UpdateGatewayDriverRequest;
import com.ecoFarm.api.v1.dto.response.GatewayDriverResponse;
import com.ecoFarm.api.v1.mapper.GatewayDriverMapper;
import com.ecoFarm.service.GatewayDriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gateway-drivers")
@RequiredArgsConstructor
public class GatewayDriverController {

    private final GatewayDriverService service;
    private final GatewayDriverMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<GatewayDriverResponse> list() {
        return service.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public GatewayDriverResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<GatewayDriverResponse> create(@Valid @RequestBody CreateGatewayDriverRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public GatewayDriverResponse update(@PathVariable UUID id,
                                        @Valid @RequestBody UpdateGatewayDriverRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
