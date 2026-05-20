package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.CommandTemplateResponse;
import com.ecoFarm.domain.entity.CommandTemplate;
import org.springframework.stereotype.Component;

@Component
public class CommandTemplateMapper {

    public CommandTemplateResponse toResponse(CommandTemplate c) {
        return new CommandTemplateResponse(
            c.getId(),
            c.getProfile().getId(),
            c.getName(),
            c.getDescription(),
            c.getRegisterNumber(),
            c.getFunctionCode(),
            c.getValue(),
            c.isConfirmationRequired(),
            c.getMinRole()
        );
    }
}
