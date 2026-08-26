package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.RejectEmailChangeRequest;
import com.ecoFarm.api.v1.dto.response.EmailChangeRequestResponse;
import com.ecoFarm.api.v1.mapper.EmailChangeRequestMapper;
import com.ecoFarm.service.EmailChangeRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Pending "change my email for me" requests, scoped to whichever tenant
 * the caller is currently acting as (same scoping every other tenant
 * resource in this app uses) — so a super admin switched into a client's
 * context sees exactly what that client's own tenant admin sees. */
@RestController
@RequestMapping("/api/v1/email-change-requests")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
@RequiredArgsConstructor
public class EmailChangeRequestController {

    private final EmailChangeRequestService service;
    private final EmailChangeRequestMapper mapper;

    @GetMapping
    public List<EmailChangeRequestResponse> listPending() {
        return service.listPendingForCurrentTenant().stream().map(mapper::toResponse).toList();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approve(@PathVariable UUID id) {
        service.approve(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable UUID id,
                                        @RequestBody(required = false) RejectEmailChangeRequest req) {
        service.reject(id, req);
        return ResponseEntity.noContent().build();
    }
}
