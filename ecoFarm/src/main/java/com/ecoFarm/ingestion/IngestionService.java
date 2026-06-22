package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.*;
import com.ecoFarm.domain.enums.*;
import com.ecoFarm.mqtt.ModbusResponseParser.ParsedResponse;
import com.ecoFarm.mqtt.RequestTracker;
import com.ecoFarm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionService {

    private final DeviceRepository deviceRepository;
    private final GatewayRepository gatewayRepository;
    private final DataPointRepository dataPointRepository;
    private final PollGroupRepository pollGroupRepository;
    private final ReadingRepository readingRepository;
    private final ControlCommandRepository controlCommandRepository;
    private final CommunicationLogRepository communicationLogRepository;
    private final RegisterDecoder decoder;
    private final RequestTracker tracker;
    private final LivePushService livePushService;
    private final AlertEvaluationService alertEvaluationService;

    @Transactional
    public void handlePollResponse(ParsedResponse response) {
        RequestTracker.PendingRequest pending = tracker.complete(response.getCookie());
        if (pending == null) {
            log.debug("No pending request for cookie {}", response.getCookie());
            return;
        }

        if (pending.getType() == RequestTracker.RequestType.COMMAND) {
            handleCommandAck(pending.getCommandId(), response);
            return;
        }

        // Any response — even an error — proves the gateway is reachable.
        // Mark gateway ONLINE regardless, then decide device status based on
        // whether the slave actually answered our registers.
        Device device = deviceRepository.findById(pending.getDeviceId()).orElse(null);
        if (device == null) return;

        Gateway gw = device.getGateway();
        Instant now = Instant.now();
        gw.setLastSeen(now);
        if (gw.getStatus() != GatewayStatus.ONLINE) {
            gw.setStatus(GatewayStatus.ONLINE);
        }

        if (!response.isSuccess()) {
            log.warn("Poll failed for device {}: {}", pending.getDeviceId(), response.getErrorMessage());
            if (device.getStatus() != DeviceStatus.ERROR) {
                device.setStatus(DeviceStatus.ERROR);
            }
            saveCommLog(gw, device, null, null, false, response.getErrorMessage());
            return;
        }

        PollGroup group = pollGroupRepository.findById(pending.getPollGroupId()).orElse(null);
        if (group == null) return;

        // Resolve data points inside this poll group's register range
        List<DataPoint> dataPoints = dataPointRepository.findByPollGroupId(group.getId());

        for (DataPoint dp : dataPoints) {
            Double value = decoder.decode(response.getValues(), group.getStartRegister(), dp);
            if (value == null) {
                log.debug("Register {} out of range for device {}", dp.getRegisterNumber(), device.getId());
                continue;
            }

            ReadingQuality quality = validateQuality(dp, value);
            int rawValue = decoder.rawIntValue(response.getValues(), group.getStartRegister(), dp);

            livePushService.pushReading(device.getTenant().getId(), new LiveReadingMessage(
                device.getId(), dp.getKey(), value, rawValue, quality, dp.getUnit(), now));

            try {
                alertEvaluationService.evaluate(device, dp.getKey(), value);
            } catch (Exception ex) {
                log.warn("Alert evaluation failed for device {} key {}: {}", device.getId(), dp.getKey(), ex.getMessage());
            }

            if (device.getRecordedDataPoints().contains(dp.getKey())) {
                readingRepository.save(Reading.builder()
                    .time(now)
                    .tenantId(device.getTenant().getId())
                    .siteId(device.getSite() != null ? device.getSite().getId() : null)
                    .gatewayId(device.getGateway().getId())
                    .deviceId(device.getId())
                    .dataPoint(dp.getKey())
                    .value(value)
                    .rawValue(rawValue)
                    .quality(quality)
                    .unit(dp.getUnit())
                    .build());
            }
        }

        // Mark device online (gateway status was set earlier in this method)
        device.setLastReadingAt(now);
        if (device.getStatus() != DeviceStatus.ONLINE) {
            device.setStatus(DeviceStatus.ONLINE);
        }

        saveCommLog(gw, device, group.getFunctionCode(), group.getStartRegister(), true, null);
    }

    @Transactional
    public void handleGatewayStatus(String serial, String status) {
        Optional<Gateway> gwOpt = gatewayRepository.findBySerialNumber(serial);
        if (gwOpt.isEmpty()) {
            log.info("Auto-registering unknown gateway: {}", serial);
            return;
        }

        Gateway gw = gwOpt.get();
        boolean online = "online".equalsIgnoreCase(status) || "1".equals(status);
        gw.setStatus(online ? GatewayStatus.ONLINE : GatewayStatus.OFFLINE);
        gw.setLastSeen(Instant.now());

        saveCommLog(gw, null, null, null, true, null);
    }

    @Transactional
    public void handleGatewayHeartbeat(String serial) {
        gatewayRepository.findBySerialNumber(serial).ifPresent(gw -> {
            gw.setLastSeen(Instant.now());
            if (gw.getStatus() == GatewayStatus.OFFLINE) {
                gw.setStatus(GatewayStatus.ONLINE);
            }
            saveCommLog(gw, null, null, null, true, null);
        });
    }

    private void handleCommandAck(java.util.UUID commandId, ParsedResponse response) {
        ControlCommand cmd = controlCommandRepository.findById(commandId).orElse(null);
        if (cmd == null) return;

        if (response.isSuccess()) {
            cmd.setStatus(CommandStatus.ACKNOWLEDGED);
            cmd.setAcknowledgedAt(Instant.now());
            cmd.setResult("OK");
        } else {
            cmd.setStatus(CommandStatus.FAILED);
            cmd.setResult(response.getErrorMessage());
        }
    }

    private void saveCommLog(Gateway gw, Device device, Integer modbusFc, Integer register,
                              boolean success, String errorMsg) {
        try {
            communicationLogRepository.save(CommunicationLog.builder()
                .tenant(gw.getTenant())
                .gateway(gw)
                .device(device)
                .direction(LogDirection.RESPONSE)
                .modbusFc(modbusFc)
                .register(register)
                .status(success ? LogStatus.OK : LogStatus.ERROR)
                .errorMessage(errorMsg)
                .build());
        } catch (Exception ex) {
            log.warn("Failed to save communication log: {}", ex.getMessage());
        }
    }

    private ReadingQuality validateQuality(DataPoint dp, double value) {
        BigDecimal min = dp.getMinValue();
        BigDecimal max = dp.getMaxValue();
        if (min != null && value < min.doubleValue()) return ReadingQuality.SUSPECT;
        if (max != null && value > max.doubleValue()) return ReadingQuality.SUSPECT;
        return ReadingQuality.GOOD;
    }
}
