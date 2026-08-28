package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.ReadingBucketResponse;
import com.ecoFarm.api.v1.dto.response.ReadingResponse;
import com.ecoFarm.api.v1.mapper.ReadingMapper;
import com.ecoFarm.domain.entity.Reading;
import com.ecoFarm.domain.enums.ReadingGranularity;
import com.ecoFarm.service.ReadingService;
import com.ecoFarm.shared.exception.ApiException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/readings")
@RequiredArgsConstructor
public class ReadingController {

    private final ReadingService service;
    private final ReadingMapper mapper;

    @GetMapping("/latest")
    public List<ReadingResponse> latestForTenant() {
        return service.latestForTenant().stream().map(mapper::toResponse).toList();
    }

    @GetMapping
    public List<ReadingResponse> query(
        @RequestParam UUID deviceId,
        @RequestParam String dataPoint,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return service.queryRange(deviceId, dataPoint, from, to)
            .stream().map(mapper::toResponse).toList();
    }

    /** Bucketed avg/min/max/count — used for the Hourly/Daily/Weekly
     * resolution views on the Data Log chart, so large ranges don't require
     * fetching (or rendering) every raw reading.
     *
     * granularity is taken as a plain String and parsed by hand, rather
     * than typed directly as ReadingGranularity — Spring's own enum
     * binding rejects an invalid value with a MethodArgumentTypeMismatchException
     * that isn't one of GlobalExceptionHandler's recognized cases, so it
     * fell through to a raw 500 instead of a clean 400 (caught by testing
     * an invalid value, not visible from the code alone). */
    @GetMapping("/aggregate")
    public List<ReadingBucketResponse> aggregate(
        @RequestParam UUID deviceId,
        @RequestParam String dataPoint,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        @RequestParam String granularity
    ) {
        ReadingGranularity parsed;
        try {
            parsed = ReadingGranularity.valueOf(granularity.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Invalid granularity '" + granularity + "' — must be HOUR, DAY, or WEEK");
        }
        return service.queryAggregate(deviceId, dataPoint, from, to, parsed).stream()
            .map(b -> new ReadingBucketResponse(
                Instant.ofEpochMilli(b.getBucketStartMs()), b.getAvgValue(), b.getMinValue(), b.getMaxValue(), b.getCnt()))
            .toList();
    }

    @GetMapping("/export")
    public void export(
        @RequestParam UUID deviceId,
        @RequestParam String dataPoint,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        HttpServletResponse response
    ) throws IOException {
        List<Reading> rows = service.queryRange(deviceId, dataPoint, from, to);

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"readings-" + deviceId + "-" + dataPoint + ".csv\"");

        try (PrintWriter writer = response.getWriter()) {
            writer.println("time,device_id,data_point,value,raw_value,quality,unit");
            for (Reading r : rows) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s%n",
                    r.getTime(),
                    r.getDeviceId(),
                    r.getDataPoint(),
                    r.getValue() != null ? r.getValue() : "",
                    r.getRawValue() != null ? r.getRawValue() : "",
                    r.getQuality(),
                    r.getUnit() != null ? r.getUnit() : ""
                );
            }
        }
    }
}
