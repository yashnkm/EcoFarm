package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.Alert;
import com.ecoFarm.domain.entity.AlertRule;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.enums.AlertCondition;
import com.ecoFarm.domain.enums.AlertStatus;
import com.ecoFarm.repository.AlertRepository;
import com.ecoFarm.repository.AlertRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertEvaluationService {

    private final AlertRuleRepository alertRuleRepository;
    private final AlertRepository alertRepository;
    private final LivePushService livePushService;

    /**
     * Called within the ingestion transaction for each decoded data point value.
     * Runs in a separate transaction so a rule-evaluation failure never rolls
     * back the reading that triggered it.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void evaluate(Device device, String dataPointKey, double value) {
        List<AlertRule> rules = alertRuleRepository
            .findByDeviceIdAndDataPointKeyAndEnabledTrue(device.getId(), dataPointKey);

        for (AlertRule rule : rules) {
            if (!conditionMet(rule.getCondition(), value, rule.getThreshold().doubleValue())) {
                continue;
            }

            // Cooldown: skip if an ACTIVE alert for this rule was triggered within cooldown window
            Instant cooldownCutoff = Instant.now()
                .minusSeconds((long) rule.getCooldownMinutes() * 60);
            boolean inCooldown = !alertRepository.findByAlertRuleIdAndStatusAndTriggeredAtAfter(
                rule.getId(), AlertStatus.ACTIVE, cooldownCutoff).isEmpty();

            if (inCooldown) {
                log.debug("Alert rule {} in cooldown for device {}", rule.getId(), device.getId());
                continue;
            }

            Alert alert = Alert.builder()
                .tenant(device.getTenant())
                .alertRule(rule)
                .device(device)
                .dataPointKey(dataPointKey)
                .triggeredValue(BigDecimal.valueOf(value))
                .severity(rule.getSeverity())
                .status(AlertStatus.ACTIVE)
                .build();

            alertRepository.save(alert);

            livePushService.pushAlert(device.getTenant().getId(), new AlertMessage(
                alert.getId(),
                rule.getId(),
                rule.getName(),
                device.getId(),
                device.getName(),
                dataPointKey,
                value,
                rule.getSeverity(),
                AlertStatus.ACTIVE,
                alert.getTriggeredAt()
            ));

            log.info("Alert fired: rule='{}' device='{}' key='{}' value={} severity={}",
                rule.getName(), device.getName(), dataPointKey, value, rule.getSeverity());
        }
    }

    private boolean conditionMet(AlertCondition condition, double value, double threshold) {
        return switch (condition) {
            case GT  -> value > threshold;
            case LT  -> value < threshold;
            case GTE -> value >= threshold;
            case LTE -> value <= threshold;
            case EQ  -> Double.compare(value, threshold) == 0;
            case NEQ -> Double.compare(value, threshold) != 0;
        };
    }
}
