package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.ControlCommandResponse;
import com.ecoFarm.api.v1.dto.response.DeviceResponse;
import com.ecoFarm.domain.entity.ControlCommand;
import com.ecoFarm.domain.entity.Device;
import org.springframework.stereotype.Component;

@Component
public class DeviceMapper {

    public DeviceResponse toResponse(Device d) {
        return new DeviceResponse(
            d.getId(),
            d.getTenant().getId(),
            d.getGateway().getId(),
            d.getSite() != null ? d.getSite().getId() : null,
            d.getZone() != null ? d.getZone().getId() : null,
            d.getProfile().getId(),
            d.getProfile().getName(),
            d.getName(),
            d.getSlaveId(),
            d.getProtocol(),
            d.getIpAddress(),
            d.getPort(),
            d.getTimeoutSeconds(),
            d.getStatus(),
            d.getLastReadingAt(),
            d.getCreatedAt(),
            d.getRecordedDataPoints(),
            d.getDataPointGroups(),
            d.getCommandGroups(),
            d.getSortOrder(),
            d.getZoneOrder()
        );
    }

    public ControlCommandResponse toResponse(ControlCommand c) {
        return new ControlCommandResponse(
            c.getId(),
            c.getDevice().getId(),
            c.getIssuedBy() != null ? c.getIssuedBy().getId() : null,
            c.getRegisterNumber(),
            c.getFunctionCode(),
            c.getValue(),
            c.getStatus(),
            c.getSentAt(),
            c.getAcknowledgedAt(),
            c.getResult(),
            c.getCreatedAt()
        );
    }
}
