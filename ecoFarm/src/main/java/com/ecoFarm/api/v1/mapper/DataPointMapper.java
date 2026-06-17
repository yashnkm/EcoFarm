package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.DataPointResponse;
import com.ecoFarm.domain.entity.DataPoint;
import org.springframework.stereotype.Component;

@Component
public class DataPointMapper {

    public DataPointResponse toResponse(DataPoint dp) {
        return new DataPointResponse(
            dp.getId(),
            dp.getProfile().getId(),
            dp.getPollGroup() != null ? dp.getPollGroup().getId() : null,
            dp.getKey(),
            dp.getLabel(),
            dp.getRegisterNumber(),
            dp.getFunctionCode(),
            dp.getDataType(),
            dp.getWordCount(),
            dp.getByteOrder(),
            dp.getScaleFactor(),
            dp.getOffset(),
            dp.getUnit(),
            dp.getMinValue(),
            dp.getMaxValue(),
            dp.isWritable(),
            dp.isDisplayed(),
            dp.getDisplayWidget(),
            dp.getDisplayGroup(),
            dp.getFalseLabel(),
            dp.getTrueLabel()
        );
    }
}
