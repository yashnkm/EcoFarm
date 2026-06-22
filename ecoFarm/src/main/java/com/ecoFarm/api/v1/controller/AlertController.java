package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateAlertRuleRequest;
import com.ecoFarm.api.v1.dto.request.UpdateAlertRuleRequest;
import com.ecoFarm.api.v1.dto.response.AlertResponse;
import com.ecoFarm.api.v1.dto.response.AlertRuleResponse;
import com.ecoFarm.api.v1.mapper.AlertMapper;
import com.ecoFarm.domain.enums.AlertStatus;
import com.ecoFarm.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AlertController {

    private final AlertService service;
    private final AlertMapper mapper;

    // ── Alert Rules ─────────────────────────────────────────────────

    @GetMapping("/api/v1/alert-rules")
    public List<AlertRuleResponse> listRules() {
        return service.listRules().stream().map(mapper::toResponse).toList();
    }

    @PostMapping("/api/v1/alert-rules")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<AlertRuleResponse> createRule(@Valid @RequestBody CreateAlertRuleRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.createRule(req)));
    }

    @PatchMapping("/api/v1/alert-rules/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public AlertRuleResponse updateRule(@PathVariable UUID id, @RequestBody UpdateAlertRuleRequest req) {
        return mapper.toResponse(service.updateRule(id, req));
    }

    @DeleteMapping("/api/v1/alert-rules/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        service.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    // ── Alerts ──────────────────────────────────────────────────────

    @GetMapping("/api/v1/alerts")
    public Page<AlertResponse> listAlerts(
        @RequestParam(required = false) AlertStatus status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "triggeredAt"));
        return service.listAlerts(status, pageable).map(mapper::toResponse);
    }

    @PatchMapping("/api/v1/alerts/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public AlertResponse acknowledge(@PathVariable UUID id) {
        return mapper.toResponse(service.acknowledge(id));
    }

    @PatchMapping("/api/v1/alerts/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public AlertResponse resolve(@PathVariable UUID id) {
        return mapper.toResponse(service.resolve(id));
    }
}
