package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.DiskHealthResponse;
import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.service.DiskHealthService;
import com.ecoFarm.service.MqttBrokerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final MqttBrokerService brokerService;
    private final DiskHealthService diskHealthService;

    /** Live MQTT status for all brokers visible to the calling user. */
    @GetMapping("/mqtt")
    public List<MqttHealthResponse> mqtt() {
        return brokerService.healthAll();
    }

    /** Server disk usage — infrastructure detail, so Super Admin only. */
    @GetMapping("/disk")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public DiskHealthResponse disk() {
        return diskHealthService.current();
    }
}
