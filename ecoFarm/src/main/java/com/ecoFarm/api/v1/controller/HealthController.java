package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.service.MqttBrokerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final MqttBrokerService brokerService;

    /** Live MQTT status for all brokers visible to the calling user. */
    @GetMapping("/mqtt")
    public List<MqttHealthResponse> mqtt() {
        return brokerService.healthAll();
    }
}
