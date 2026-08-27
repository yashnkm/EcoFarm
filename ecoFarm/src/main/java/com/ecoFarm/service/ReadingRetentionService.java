package com.ecoFarm.service;

import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.SamplingGroupChannel;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.ReadingRepository;
import com.ecoFarm.repository.SamplingGroupChannelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nightly cleanup of old readings, in two categories:
 *
 *  - A channel that's in a Sampling Group keeps its history forever unless
 *    that group has a retention window set — opt-in, so a group nobody's
 *    touched the retention field on never silently prunes history.
 *  - Points recorded only because they're a toggle command's
 *    statusDataPointKey (see IngestionService — that write happens every
 *    tick regardless of any Sampling Group) get a fixed default cap
 *    instead of growing unbounded with no way to control them — unless
 *    that same point is ALSO in a Sampling Group, in which case the
 *    group's retention wins (a deliberate admin choice beats a default).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingRetentionService {

    /** Cap for points recorded only as a toggle's status reference, never
     * grouped for its own sake — not opt-in like a group's retentionDays,
     * since there's no existing admin choice to respect here either way. */
    private static final int STATUS_ONLY_RETENTION_DAYS = 30;

    private final DeviceRepository deviceRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final SamplingGroupChannelRepository samplingGroupChannelRepository;
    private final ReadingRepository readingRepository;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void purgeExpiredReadings() {
        Instant now = Instant.now();
        int totalDeleted = 0;
        Set<String> groupedChannelKeys = new HashSet<>();

        // Category 1: grouped channels with an explicit retention window.
        for (SamplingGroupChannel channel : samplingGroupChannelRepository.findAll()) {
            groupedChannelKeys.add(channel.getDevice().getId() + ":" + channel.getDataPointKey());
            Integer days = channel.getSamplingGroup().getRetentionDays();
            if (days == null || days <= 0) continue; // forever
            Instant cutoff = now.minus(days, ChronoUnit.DAYS);
            totalDeleted += readingRepository.deleteOlderThan(channel.getDevice().getId(), channel.getDataPointKey(), cutoff);
        }

        // Category 2: status-only points, fixed default cap — skipped for
        // any point that's also grouped, since category 1 already applied
        // that group's own (possibly longer, possibly forever) retention.
        Instant statusCutoff = now.minus(STATUS_ONLY_RETENTION_DAYS, ChronoUnit.DAYS);
        for (Device device : deviceRepository.findAll()) {
            Set<String> statusPointKeys = commandTemplateRepository.findByProfileId(device.getProfile().getId())
                .stream()
                .map(CommandTemplate::getStatusDataPointKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

            for (String key : statusPointKeys) {
                if (groupedChannelKeys.contains(device.getId() + ":" + key)) continue;
                totalDeleted += readingRepository.deleteOlderThan(device.getId(), key, statusCutoff);
            }
        }

        log.info("Reading retention cleanup: deleted {} rows", totalDeleted);
    }
}
