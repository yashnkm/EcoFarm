package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.config.MqttProperties;
import com.ecoFarm.mqtt.MqttConnectionMonitor;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final MqttConnectionMonitor monitor;
    private final MqttProperties mqttProperties;

    @GetMapping("/mqtt")
    public MqttHealthResponse mqtt() {
        return new MqttHealthResponse(
            monitor.isConnected(),
            mqttProperties.getBrokerUrl(),
            monitor.getLastConnectedAt(),
            monitor.getLastFailureAt(),
            monitor.getLastError()
        );
    }
}
