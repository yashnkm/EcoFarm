package com.ecoFarm.service;

import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Reading;
import com.ecoFarm.domain.entity.Site;
import com.ecoFarm.domain.enums.ReadingGranularity;
import com.ecoFarm.repository.ReadingBucketProjection;
import com.ecoFarm.repository.ReadingRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
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

    private static final long MAX_RANGE_HOURS = 24 * 90; // 90 days cap per raw query
    private static final long MAX_BUCKETS = 5000; // sanity cap on aggregate result size

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

    /** Bucketed avg/min/max/count for Hourly/Daily/Weekly resolution views —
     * no 90-day cap like queryRange, since result size is bounded by bucket
     * count rather than raw row count; instead caps the number of buckets a
     * request could produce, so e.g. asking for hourly resolution over
     * several years (tens of thousands of buckets, defeating the point of
     * aggregating at all) is rejected with a clear message rather than
     * quietly returning a huge payload. */
    @Transactional(readOnly = true)
    public List<ReadingBucketProjection> queryAggregate(
            UUID deviceId, String dataPoint, Instant from, Instant to, ReadingGranularity granularity) {
        Device device = deviceService.findInTenant(deviceId); // tenant isolation

        Instant effectiveTo   = to   != null ? to   : Instant.now();
        Instant effectiveFrom = from != null ? from : effectiveTo.minus(30, ChronoUnit.DAYS);

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw ApiException.badRequest("'from' must be before 'to'");
        }

        long hours = ChronoUnit.HOURS.between(effectiveFrom, effectiveTo);
        long bucketHours = switch (granularity) {
            case HOUR -> 1;
            case DAY -> 24;
            case WEEK -> 24 * 7;
        };
        long estimatedBuckets = Math.max(1, hours / bucketHours);
        if (estimatedBuckets > MAX_BUCKETS) {
            throw ApiException.badRequest(
                "Range too large for " + granularity + " resolution — narrow the range or pick a coarser one");
        }

        String unit = switch (granularity) {
            case HOUR -> "hour";
            case DAY -> "day";
            case WEEK -> "week";
        };
        return readingRepository.aggregateRange(device.getId(), dataPoint, effectiveFrom, effectiveTo, unit);
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

    @Transactional(readOnly = true)
    public List<Reading> latestForTenant() {
        return readingRepository.findLatestForTenant(SecurityUtil.currentTenantId());
    }
}
