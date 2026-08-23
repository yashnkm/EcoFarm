package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.CommandTemplateResponse;
import com.ecoFarm.domain.entity.CommandTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class CommandTemplateMapper {

    public CommandTemplateResponse toResponse(CommandTemplate c) {
        return new CommandTemplateResponse(
            c.getId(),
            c.getProfile().getId(),
            c.getName(),
            c.getKey(),
            c.getDescription(),
            c.getRegisterNumber(),
            c.getFunctionCode(),
            c.getValue(),
            c.isConfirmationRequired(),
            c.getMinRole(),
            c.isPromptForValue(),
            c.getOffValue(),
            c.getStatusDataPointKey(),
            c.getCategory(),
            // Rows saved before this field existed have a null column —
            // present them as the no-op conversion rather than leaking null
            // to every API consumer.
            c.getScaleFactor() != null ? c.getScaleFactor() : BigDecimal.ONE,
            c.getOffset() != null ? c.getOffset() : BigDecimal.ZERO,
            c.getUnit()
        );
    }
}
