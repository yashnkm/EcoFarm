package com.ecoFarm.service;

import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.ReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nightly cleanup of old readings, in two categories:
 *
 *  - Points an admin explicitly opted into "Record" keep their history
 *    forever unless a retention window is set for that key in
 *    Device.recordedDataPointRetentionDays — opt-in, so existing setups
 *    aren't affected until someone deliberately picks a window.
 *  - Points recorded only because they're a toggle command's
 *    statusDataPointKey (see IngestionService — that write happens
 *    regardless of Record) were never a deliberate choice to keep, so they
 *    get a fixed default cap instead of growing unbounded with no way to
 *    control them at all.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingRetentionService {

    /** Cap for points recorded only as a toggle's status reference, never
     * explicitly opted into Record — not opt-in like recordedDataPointRetentionDays,
     * since there's no existing admin choice to respect here either way. */
    private static final int STATUS_ONLY_RETENTION_DAYS = 30;

    private final DeviceRepository deviceRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final ReadingRepository readingRepository;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void purgeExpiredReadings() {
        Instant now = Instant.now();
        int totalDeleted = 0;

        for (Device device : deviceRepository.findAll()) {
            Set<String> statusPointKeys = commandTemplateRepository.findByProfileId(device.getProfile().getId())
                .stream()
                .map(CommandTemplate::getStatusDataPointKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

            // Category 1: explicit, opt-in retention windows.
            for (Map.Entry<String, Integer> entry : device.getRecordedDataPointRetentionDays().entrySet()) {
                String key = entry.getKey();
                Integer days = entry.getValue();
                if (days == null || days <= 0) continue;
                if (!device.getRecordedDataPoints().contains(key)) continue; // stale entry for a point no longer recorded
                Instant cutoff = now.minus(days, ChronoUnit.DAYS);
                totalDeleted += readingRepository.deleteOlderThan(device.getId(), key, cutoff);
            }

            // Category 2: status-only points, fixed default cap.
            Instant statusCutoff = now.minus(STATUS_ONLY_RETENTION_DAYS, ChronoUnit.DAYS);
            for (String key : statusPointKeys) {
                if (device.getRecordedDataPoints().contains(key)) continue; // explicitly recorded — category 1 already covers it
                totalDeleted += readingRepository.deleteOlderThan(device.getId(), key, statusCutoff);
            }
        }

        log.info("Reading retention cleanup: deleted {} rows", totalDeleted);
    }
}
