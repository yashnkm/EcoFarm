package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.PollGroupRequest;
import com.ecoFarm.api.v1.dto.response.PollGroupResponse;
import com.ecoFarm.api.v1.mapper.PollGroupMapper;
import com.ecoFarm.service.PollGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-profiles/{profileId}/poll-groups")
@RequiredArgsConstructor
public class PollGroupController {

    private final PollGroupService service;
    private final PollGroupMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public List<PollGroupResponse> list(@PathVariable UUID profileId) {
        return service.list(profileId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public PollGroupResponse get(@PathVariable UUID profileId, @PathVariable UUID id) {
        return mapper.toResponse(service.findInProfile(profileId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<PollGroupResponse> create(@PathVariable UUID profileId,
                                                    @Valid @RequestBody PollGroupRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(profileId, req)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public PollGroupResponse update(@PathVariable UUID profileId,
                                    @PathVariable UUID id,
                                    @Valid @RequestBody PollGroupRequest req) {
        return mapper.toResponse(service.update(profileId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID profileId, @PathVariable UUID id) {
        service.delete(profileId, id);
        return ResponseEntity.noContent().build();
    }
}
