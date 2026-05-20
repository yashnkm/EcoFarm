package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CommandTemplateRequest;
import com.ecoFarm.api.v1.dto.response.CommandTemplateResponse;
import com.ecoFarm.api.v1.mapper.CommandTemplateMapper;
import com.ecoFarm.service.CommandTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-profiles/{profileId}/commands")
@RequiredArgsConstructor
public class CommandTemplateController {

    private final CommandTemplateService service;
    private final CommandTemplateMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<CommandTemplateResponse> list(@PathVariable UUID profileId) {
        return service.list(profileId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public CommandTemplateResponse get(@PathVariable UUID profileId, @PathVariable UUID id) {
        return mapper.toResponse(service.findInProfile(profileId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<CommandTemplateResponse> create(@PathVariable UUID profileId,
                                                          @Valid @RequestBody CommandTemplateRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(profileId, req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public CommandTemplateResponse update(@PathVariable UUID profileId,
                                          @PathVariable UUID id,
                                          @Valid @RequestBody CommandTemplateRequest req) {
        return mapper.toResponse(service.update(profileId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID profileId, @PathVariable UUID id) {
        service.delete(profileId, id);
        return ResponseEntity.noContent().build();
    }
}
