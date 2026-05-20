package com.ecoFarm.service;

import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Reading;
import com.ecoFarm.domain.entity.Site;
import com.ecoFarm.repository.ReadingRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReadingService {

    private static final long MAX_RANGE_HOURS = 24 * 90; // 90 days cap per query

    private final ReadingRepository readingRepository;
    private final DeviceService deviceService;
    private final SiteService siteService;

    @Transactional(readOnly = true)
    public List<Reading> queryRange(UUID deviceId, String dataPoint, Instant from, Instant to) {
        Device device = deviceService.findInTenant(deviceId); // tenant isolation

        Instant effectiveTo   = to   != null ? to   : Instant.now();
        Instant effectiveFrom = from != null ? from : effectiveTo.minus(1, ChronoUnit.HOURS);

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw ApiException.badRequest("'from' must be before 'to'");
        }
        long hours = ChronoUnit.HOURS.between(effectiveFrom, effectiveTo);
        if (hours > MAX_RANGE_HOURS) {
            throw ApiException.badRequest("Range too large — max " + MAX_RANGE_HOURS + " hours");
        }

        return readingRepository.findRange(device.getId(), dataPoint, effectiveFrom, effectiveTo);
    }

    @Transactional(readOnly = true)
    public List<Reading> latestForDevice(UUID deviceId) {
        Device device = deviceService.findInTenant(deviceId);
        return readingRepository.findLatestPerDataPoint(device.getId());
    }

    @Transactional(readOnly = true)
    public List<Reading> latestForSite(UUID siteId) {
        Site site = siteService.findInTenant(siteId);
        return readingRepository.findLatestForSite(site.getId());
    }
}
