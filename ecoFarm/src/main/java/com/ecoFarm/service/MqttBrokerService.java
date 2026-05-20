package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.request.UpdateMqttBrokerRequest;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.repository.MqttBrokerRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MqttBrokerService {

    private final MqttBrokerRepository repository;

    @Transactional(readOnly = true)
    public List<MqttBroker> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public MqttBroker findById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> ApiException.notFound("MQTT broker not found"));
    }

    @Transactional
    public MqttBroker create(CreateMqttBrokerRequest req) {
        if (repository.existsByName(req.name())) {
            throw ApiException.conflict("Broker with this name already exists");
        }

        MqttBroker broker = MqttBroker.builder()
            .name(req.name())
            .host(req.host())
            .port(req.port())
            .useTls(Boolean.TRUE.equals(req.useTls()))
            .username(req.username())
            .password(req.password())
            .keepaliveSeconds(req.keepaliveSeconds() != null ? req.keepaliveSeconds() : 60)
            .defaultQos(req.defaultQos() != null ? req.defaultQos() : 1)
            .build();

        return repository.save(broker);
    }

    @Transactional
    public MqttBroker update(UUID id, UpdateMqttBrokerRequest req) {
        MqttBroker b = findById(id);
        if (req.name() != null)              b.setName(req.name());
        if (req.host() != null)              b.setHost(req.host());
        if (req.port() != null)              b.setPort(req.port());
        if (req.useTls() != null)            b.setUseTls(req.useTls());
        if (req.username() != null)          b.setUsername(req.username());
        if (req.password() != null && !req.password().isBlank())
                                             b.setPassword(req.password());
        if (req.keepaliveSeconds() != null)  b.setKeepaliveSeconds(req.keepaliveSeconds());
        if (req.defaultQos() != null)        b.setDefaultQos(req.defaultQos());
        if (req.status() != null)            b.setStatus(req.status());
        return b;
    }

    @Transactional
    public void delete(UUID id) {
        MqttBroker b = findById(id);
        repository.delete(b);
    }
}
