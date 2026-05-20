package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.ReadingResponse;
import com.ecoFarm.domain.entity.Reading;
import org.springframework.stereotype.Component;

@Component
public class ReadingMapper {

    public ReadingResponse toResponse(Reading r) {
        return new ReadingResponse(
            r.getTime(),
            r.getDeviceId(),
            r.getDataPoint(),
            r.getValue(),
            r.getRawValue(),
            r.getQuality(),
            r.getUnit()
        );
    }
}
