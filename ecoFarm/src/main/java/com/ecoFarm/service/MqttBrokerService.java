package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.request.UpdateMqttBrokerRequest;
import com.ecoFarm.api.v1.dto.response.MqttHealthResponse;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.mqtt.MqttConnectionManager;
import com.ecoFarm.repository.MqttBrokerRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MqttBrokerService {

    private final MqttBrokerRepository repository;
    private final TenantRepository tenantRepository;
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
        connectionManager.disconnect(id);
        repository.delete(b);
    }

    /** Live MQTT status for the broker assigned to the current user's tenant. */
    @Transactional(readOnly = true)
    public MqttHealthResponse healthForCurrentTenant() {
        UUID tenantId = SecurityUtil.currentTenantId();
        Tenant tenant = tenantId != null
            ? tenantRepository.findById(tenantId).orElse(null)
            : null;
        MqttBroker broker = tenant != null ? tenant.getMqttBroker() : null;

        if (broker == null) {
            return new MqttHealthResponse(false, null, null, null, null,
                "No MQTT broker assigned to this tenant");
        }

        MqttConnectionManager.BrokerHealth h = connectionManager.healthFor(broker);
        return new MqttHealthResponse(
            h.connected(),
            broker.getBrokerUrl(),
            broker.getName(),
            h.lastConnectedAt(),
            h.lastFailureAt(),
            h.lastError()
        );
    }
}
