package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.ReadingResponse;
import com.ecoFarm.api.v1.mapper.ReadingMapper;
import com.ecoFarm.domain.entity.Reading;
import com.ecoFarm.service.ReadingService;
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
