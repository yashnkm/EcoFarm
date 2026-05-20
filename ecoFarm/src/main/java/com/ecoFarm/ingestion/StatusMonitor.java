package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.enums.DeviceStatus;
import com.ecoFarm.domain.enums.GatewayStatus;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.GatewayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Marks gateways and devices as OFFLINE when we haven't heard from them
 * for longer than the configured threshold. Runs every 15 seconds.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StatusMonitor {

    /** Gateway goes OFFLINE if no response received in this window. */
    private static final Duration GATEWAY_STALE_AFTER = Duration.ofSeconds(30);

    /** Device goes OFFLINE if no reading stored in this window. */
    private static final Duration DEVICE_STALE_AFTER = Duration.ofSeconds(45);

    private final GatewayRepository gatewayRepository;
    private final DeviceRepository deviceRepository;

    @Scheduled(fixedDelayString = "15000", initialDelayString = "30000")
    @Transactional
    public void sweep() {
        Instant now = Instant.now();
        Instant gatewayCutoff = now.minus(GATEWAY_STALE_AFTER);
        Instant deviceCutoff = now.minus(DEVICE_STALE_AFTER);

        // Gateways
        for (Gateway gw : gatewayRepository.findAll()) {
            if (gw.getStatus() != GatewayStatus.ONLINE && gw.getStatus() != GatewayStatus.DEGRADED) continue;
            if (gw.getLastSeen() == null || gw.getLastSeen().isBefore(gatewayCutoff)) {
                log.info("Gateway {} went OFFLINE (last seen: {})", gw.getSerialNumber(), gw.getLastSeen());
                gw.setStatus(GatewayStatus.OFFLINE);
            }
        }

        // Devices
        for (Device device : deviceRepository.findAll()) {
            if (device.getStatus() == DeviceStatus.OFFLINE) continue;
            if (device.getLastReadingAt() == null || device.getLastReadingAt().isBefore(deviceCutoff)) {
                log.info("Device {} went OFFLINE (last reading: {})", device.getName(), device.getLastReadingAt());
                device.setStatus(DeviceStatus.OFFLINE);
            }
        }
    }
}
