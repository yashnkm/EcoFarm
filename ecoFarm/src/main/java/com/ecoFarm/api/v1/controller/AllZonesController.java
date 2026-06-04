package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.ZoneResponse;
import com.ecoFarm.api.v1.mapper.ZoneMapper;
import com.ecoFarm.service.ZoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/zones")
@RequiredArgsConstructor
public class AllZonesController {

    private final ZoneService zoneService;
    private final ZoneMapper mapper;

    @GetMapping
    public List<ZoneResponse> listAll() {
        return zoneService.listForCurrentTenant().stream().map(mapper::toResponse).toList();
    }
}
