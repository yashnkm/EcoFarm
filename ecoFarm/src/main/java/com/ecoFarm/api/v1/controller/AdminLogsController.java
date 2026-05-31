package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.AuditLogResponse;
import com.ecoFarm.api.v1.dto.response.CommunicationLogResponse;
import com.ecoFarm.api.v1.dto.response.SystemEventResponse;
import com.ecoFarm.service.AdminLogsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/logs")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminLogsController {

    private final AdminLogsService logsService;

    @GetMapping("/audit")
    public Page<AuditLogResponse> auditLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return logsService.getAuditLogs(page, Math.min(size, 100));
    }

    @GetMapping("/events")
    public Page<SystemEventResponse> systemEvents(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return logsService.getSystemEvents(page, Math.min(size, 100));
    }

    @GetMapping("/comms")
    public Page<CommunicationLogResponse> commLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return logsService.getCommLogs(page, Math.min(size, 100));
    }
}
