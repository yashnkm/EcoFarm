package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.ChannelResponse;
import com.ecoFarm.api.v1.dto.response.SamplingGroupResponse;
import com.ecoFarm.domain.entity.DataPoint;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.SamplingGroup;
import com.ecoFarm.domain.entity.SamplingGroupChannel;
import com.ecoFarm.repository.DataPointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SamplingGroupMapper {

    private final DataPointRepository dataPointRepository;

    public SamplingGroupResponse toResponse(SamplingGroup g) {
        return new SamplingGroupResponse(
            g.getId(),
            g.getName(),
            g.getDescription(),
            g.getSampleIntervalMinutes(),
            g.getRetentionDays(),
            g.getCreatedAt(),
            g.getChannels().stream().map(this::toChannelResponse).toList()
        );
    }

    private ChannelResponse toChannelResponse(SamplingGroupChannel c) {
        Device d = c.getDevice();
        // Label/unit come from the profile's data point definition, resolved
        // by key — same lookup CommandTemplateService uses for statusDataPointKey.
        // Missing (e.g. the definition was since deleted) falls back to the
        // raw key instead of failing the whole group.
        DataPoint dp = dataPointRepository.findByProfileIdAndKey(d.getProfile().getId(), c.getDataPointKey())
            .orElse(null);
        return new ChannelResponse(
            d.getId(),
            d.getName(),
            d.getSite() != null ? d.getSite().getId() : null,
            d.getSite() != null ? d.getSite().getName() : null,
            c.getDataPointKey(),
            dp != null ? dp.getLabel() : c.getDataPointKey(),
            dp != null ? dp.getUnit() : null
        );
    }
}
