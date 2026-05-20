package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.CreateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.request.UpdateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.response.MqttBrokerResponse;
import com.ecoFarm.api.v1.mapper.MqttBrokerMapper;
import com.ecoFarm.service.MqttBrokerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/brokers")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class MqttBrokerController {

    private final MqttBrokerService service;
    private final MqttBrokerMapper mapper;

    @GetMapping
    public List<MqttBrokerResponse> list() {
        return service.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public MqttBrokerResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<MqttBrokerResponse> create(@Valid @RequestBody CreateMqttBrokerRequest req) {
        return ResponseEntity.status(201).body(mapper.toResponse(service.create(req)));
    }

    @PatchMapping("/{id}")
    public MqttBrokerResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateMqttBrokerRequest req) {
        return mapper.toResponse(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
