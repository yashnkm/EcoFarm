package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateGatewayDriverRequest;
import com.ecoFarm.api.v1.dto.request.UpdateGatewayDriverRequest;
import com.ecoFarm.domain.entity.GatewayDriver;
import com.ecoFarm.repository.GatewayDriverRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GatewayDriverService {

    private final GatewayDriverRepository repo;

    @Transactional(readOnly = true)
    public List<GatewayDriver> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public GatewayDriver findById(UUID id) {
        return repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("Gateway driver not found"));
    }

    @Transactional
    public GatewayDriver create(CreateGatewayDriverRequest req) {
        GatewayDriver driver = GatewayDriver.builder()
            .name(req.name())
            .transport(req.transport())
            .protocol(req.protocol())
            .requestFormat(req.requestFormat())
            .responseParser(req.responseParser())
            .supportsBroadcast(req.supportsBroadcast() != null && req.supportsBroadcast())
            .messageType(req.messageType() != null ? req.messageType() : "ASCII")
            .topicRequest(req.topicRequest() != null ? req.topicRequest() : "request/{serial}")
            .topicResponse(req.topicResponse() != null ? req.topicResponse() : "response/{serial}")
            .topicStatus(req.topicStatus())
            .build();
        return repo.save(driver);
    }

    @Transactional
    public GatewayDriver update(UUID id, UpdateGatewayDriverRequest req) {
        GatewayDriver driver = findById(id);
        if (req.name() != null)              driver.setName(req.name());
        if (req.transport() != null)         driver.setTransport(req.transport());
        if (req.protocol() != null)          driver.setProtocol(req.protocol());
        if (req.requestFormat() != null)     driver.setRequestFormat(req.requestFormat());
        if (req.responseParser() != null)    driver.setResponseParser(req.responseParser());
        if (req.supportsBroadcast() != null) driver.setSupportsBroadcast(req.supportsBroadcast());
        if (req.messageType() != null)       driver.setMessageType(req.messageType());
        if (req.topicRequest() != null)      driver.setTopicRequest(req.topicRequest());
        if (req.topicResponse() != null)     driver.setTopicResponse(req.topicResponse());
        if (req.topicStatus() != null)       driver.setTopicStatus(req.topicStatus());
        return driver;
    }

    @Transactional
    public void delete(UUID id) {
        GatewayDriver driver = findById(id);
        repo.delete(driver);
    }
}
