package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.request.UpdateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.mqtt.MqttConnectionManager;
import com.ecoFarm.repository.GatewayRepository;
import com.ecoFarm.repository.MqttBrokerRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MqttBrokerService {

    private final MqttBrokerRepository repository;
    private final GatewayRepository gatewayRepository;
    private final MqttConnectionManager connectionManager;

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

        MqttBroker saved = repository.save(broker);
        connectionManager.connect(saved);
        return saved;
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
        connectionManager.reconnect(b);
        return b;
    }

    @Transactional
    public void delete(UUID id) {
        MqttBroker b = findById(id);
        if (gatewayRepository.existsByMqttBrokerId(id)) {
            throw ApiException.conflict(
                "Cannot delete broker '" + b.getName() + "' — it is still assigned to one or more gateways. " +
                "Reassign those gateways to a different broker first.");
        }
        connectionManager.disconnect(id);
        repository.delete(b);
    }

    /**
     * Live MQTT status for all brokers visible to the current user:
     * SUPER_ADMIN sees every broker; other roles see only the brokers
     * assigned to their tenant's gateways.
     */
    @Transactional(readOnly = true)
    public List<MqttHealthResponse> healthAll() {
        List<MqttBroker> brokers;

        if (SecurityUtil.currentUser().getRole() == Role.SUPER_ADMIN) {
            brokers = repository.findAll();
        } else {
            UUID tenantId = SecurityUtil.currentTenantId();
            brokers = gatewayRepository.findByTenantId(tenantId).stream()
                .map(Gateway::getMqttBroker)
                .filter(b -> b != null)
                .distinct()
                .collect(Collectors.toList());
        }

        return brokers.stream().map(broker -> {
            MqttConnectionManager.BrokerHealth h = connectionManager.healthFor(broker);
            return new MqttHealthResponse(
                broker.getId(),
                h.connected(),
                broker.getBrokerUrl(),
                broker.getName(),
                h.lastConnectedAt(),
                h.lastFailureAt(),
                h.lastError()
            );
        }).collect(Collectors.toList());
    }
}
