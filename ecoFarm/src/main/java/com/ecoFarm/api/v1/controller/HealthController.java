package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.service.MqttBrokerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final MqttBrokerService brokerService;

    /** Live MQTT status for the broker assigned to the calling user's tenant. */
    @GetMapping("/mqtt")
    public MqttHealthResponse mqtt() {
        return brokerService.healthForCurrentTenant();
    }
}
