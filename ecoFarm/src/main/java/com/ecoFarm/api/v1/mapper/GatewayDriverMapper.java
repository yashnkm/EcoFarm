package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.GatewayDriverResponse;
import com.ecoFarm.domain.entity.GatewayDriver;
import org.springframework.stereotype.Component;

@Component
public class GatewayDriverMapper {

    public GatewayDriverResponse toResponse(GatewayDriver d) {
        return new GatewayDriverResponse(
            d.getId(),
            d.getName(),
            d.getTransport(),
            d.getProtocol(),
            d.getRequestFormat(),
            d.getResponseParser(),
            d.isSupportsBroadcast(),
            d.getMessageType(),
            d.getTopicRequest(),
            d.getTopicResponse(),
            d.getTopicStatus(),
            d.getCreatedAt()
        );
    }
}
