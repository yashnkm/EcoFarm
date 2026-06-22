package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.AlertResponse;
import com.ecoFarm.api.v1.dto.response.AlertRuleResponse;
import com.ecoFarm.domain.entity.Alert;
import com.ecoFarm.domain.entity.AlertRule;
import org.springframework.stereotype.Component;

@Component
public class AlertMapper {

    public AlertRuleResponse toResponse(AlertRule r) {
        return new AlertRuleResponse(
            r.getId(),
            r.getTenant().getId(),
            r.getDevice().getId(),
            r.getDevice().getName(),
            r.getDataPointKey(),
            r.getName(),
            r.getCondition(),
            r.getThreshold(),
            r.getSeverity(),
            r.isEnabled(),
            r.getCooldownMinutes(),
            r.getCreatedAt(),
            r.getUpdatedAt()
        );
    }

    public AlertResponse toResponse(Alert a) {
        return new AlertResponse(
            a.getId(),
            a.getTenant().getId(),
            a.getAlertRule().getId(),
            a.getAlertRule().getName(),
            a.getDevice().getId(),
            a.getDevice().getName(),
            a.getDataPointKey(),
            a.getTriggeredValue(),
            a.getSeverity(),
            a.getStatus(),
            a.getTriggeredAt(),
            a.getAcknowledgedAt(),
            a.getAcknowledgedBy() != null ? a.getAcknowledgedBy().getId() : null,
            a.getResolvedAt(),
            a.getResolvedBy() != null ? a.getResolvedBy().getId() : null
        );
    }
}
