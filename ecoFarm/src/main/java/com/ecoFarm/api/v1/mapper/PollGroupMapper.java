package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.PollGroupResponse;
import com.ecoFarm.domain.entity.PollGroup;
import org.springframework.stereotype.Component;

@Component
public class PollGroupMapper {

    public PollGroupResponse toResponse(PollGroup g) {
        return new PollGroupResponse(
            g.getId(),
            g.getProfile().getId(),
            g.getName(),
            g.getIntervalSeconds(),
            g.getStartRegister(),
            g.getCount()
        );
    }
}
