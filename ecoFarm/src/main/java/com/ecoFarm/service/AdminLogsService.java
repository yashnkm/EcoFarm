package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.response.AuditLogResponse;
import com.ecoFarm.api.v1.dto.response.CommunicationLogResponse;
import com.ecoFarm.api.v1.dto.response.SystemEventResponse;
import com.ecoFarm.domain.entity.AuditLog;
import com.ecoFarm.domain.entity.CommunicationLog;
import com.ecoFarm.domain.entity.SystemEventLog;
import com.ecoFarm.repository.AuditLogRepository;
import com.ecoFarm.repository.CommunicationLogRepository;
import com.ecoFarm.repository.SystemEventLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminLogsService {

    private final AuditLogRepository auditLogRepository;
    private final SystemEventLogRepository systemEventLogRepository;
    private final CommunicationLogRepository communicationLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findAll(pageable).map(this::toAuditResponse);
    }

    @Transactional(readOnly = true)
    public Page<SystemEventResponse> getSystemEvents(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return systemEventLogRepository.findAll(pageable).map(this::toEventResponse);
    }

    @Transactional(readOnly = true)
    public Page<CommunicationLogResponse> getCommLogs(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return communicationLogRepository.findAll(pageable).map(this::toCommResponse);
    }

    private AuditLogResponse toAuditResponse(AuditLog log) {
        return new AuditLogResponse(
            log.getId(),
            log.getTenant() != null ? log.getTenant().getName() : null,
            log.getUser() != null ? log.getUser().getEmail() : null,
            log.getAction(),
            log.getResourceType(),
            log.getResourceId(),
            log.getPayload(),
            log.getIpAddress(),
            log.getCreatedAt()
        );
    }

    private SystemEventResponse toEventResponse(SystemEventLog log) {
        return new SystemEventResponse(
            log.getId(),
            log.getTenant() != null ? log.getTenant().getName() : null,
            log.getEventType(),
            log.getSite() != null ? log.getSite().getName() : null,
            log.getGateway() != null ? log.getGateway().getSerialNumber() : null,
            log.getDevice() != null ? log.getDevice().getName() : null,
            log.getSeverity(),
            log.getMessage(),
            log.getPayload(),
            log.getCreatedAt()
        );
    }

    private CommunicationLogResponse toCommResponse(CommunicationLog log) {
        return new CommunicationLogResponse(
            log.getId(),
            log.getTenant() != null ? log.getTenant().getName() : null,
            log.getGateway() != null ? log.getGateway().getSerialNumber() : null,
            log.getDevice() != null ? log.getDevice().getName() : null,
            log.getDirection(),
            log.getModbusFc(),
            log.getRegister(),
            log.getValue(),
            log.getStatus(),
            log.getErrorMessage(),
            log.getCreatedAt()
        );
    }
}
