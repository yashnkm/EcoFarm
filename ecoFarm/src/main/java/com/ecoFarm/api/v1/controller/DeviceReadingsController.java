package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.ReadingResponse;
import com.ecoFarm.api.v1.mapper.ReadingMapper;
import com.ecoFarm.service.ReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices/{id}/readings")
@RequiredArgsConstructor
public class DeviceReadingsController {

    private final ReadingService service;
    private final ReadingMapper mapper;

    @GetMapping("/latest")
    public List<ReadingResponse> latest(@PathVariable UUID id) {
        return service.latestForDevice(id).stream().map(mapper::toResponse).toList();
    }
}
