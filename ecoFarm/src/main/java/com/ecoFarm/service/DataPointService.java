package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.DataPointRequest;
import com.ecoFarm.domain.entity.DataPoint;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.entity.PollGroup;
import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.DataType;
import com.ecoFarm.domain.enums.DisplayWidget;
import com.ecoFarm.repository.DataPointRepository;
import com.ecoFarm.repository.PollGroupRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DataPointService {

    private final DataPointRepository repo;
    private final PollGroupRepository pollGroupRepository;
    private final DeviceProfileService profileService;

    @Transactional(readOnly = true)
    public List<DataPoint> list(UUID profileId) {
        profileService.findAvailable(profileId);
        return repo.findByProfileId(profileId);
    }

    @Transactional(readOnly = true)
    public DataPoint findInProfile(UUID profileId, UUID id) {
        profileService.findAvailable(profileId);
        DataPoint dp = repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("Data point not found"));
        if (!dp.getProfile().getId().equals(profileId)) {
            throw ApiException.notFound("Data point not found");
        }
        return dp;
    }

    @Transactional
    public DataPoint create(UUID profileId, DataPointRequest req) {
        DeviceProfile profile = profileService.findEditable(profileId);

        if (repo.findByProfileIdAndKey(profileId, req.key()).isPresent()) {
            throw ApiException.conflict("A data point with this key already exists in the profile");
        }

        PollGroup pollGroup = requirePollGroup(profileId, req.pollGroupId());
        DataPoint dp = DataPoint.builder()
            .profile(profile)
            .pollGroup(pollGroup)
            .key(req.key())
            .label(req.label())
            .registerNumber(req.registerNumber())
            .functionCode(pollGroup.getFunctionCode())
            .dataType(req.dataType() != null ? req.dataType() : DataType.UINT16)
            .wordCount(req.wordCount() != null ? req.wordCount() : 1)
            .byteOrder(req.byteOrder() != null ? req.byteOrder() : ByteOrder.BIG_ENDIAN)
            .scaleFactor(req.scaleFactor() != null ? req.scaleFactor() : BigDecimal.ONE)
            .offset(req.offset() != null ? req.offset() : BigDecimal.ZERO)
            .unit(req.unit())
            .minValue(req.minValue())
            .maxValue(req.maxValue())
            .writable(Boolean.TRUE.equals(req.writable()))
            .displayed(req.displayed() == null || req.displayed())
            .displayWidget(req.displayWidget() != null ? req.displayWidget() : DisplayWidget.NUMBER)
            .displayGroup(req.displayGroup())
            .falseLabel(req.falseLabel())
            .trueLabel(req.trueLabel())
            .build();

        return repo.save(dp);
    }

    @Transactional
    public DataPoint update(UUID profileId, UUID id, DataPointRequest req) {
        profileService.findEditable(profileId);
        DataPoint dp = findInProfile(profileId, id);

        if (!dp.getKey().equals(req.key())
            && repo.findByProfileIdAndKey(profileId, req.key()).isPresent()) {
            throw ApiException.conflict("A data point with this key already exists");
        }

        PollGroup pollGroup = requirePollGroup(profileId, req.pollGroupId());
        dp.setKey(req.key());
        dp.setLabel(req.label());
        dp.setRegisterNumber(req.registerNumber());
        dp.setPollGroup(pollGroup);
        dp.setFunctionCode(pollGroup.getFunctionCode());
        if (req.dataType() != null)      dp.setDataType(req.dataType());
        if (req.wordCount() != null)     dp.setWordCount(req.wordCount());
        if (req.byteOrder() != null)     dp.setByteOrder(req.byteOrder());
        if (req.scaleFactor() != null)   dp.setScaleFactor(req.scaleFactor());
        if (req.offset() != null)        dp.setOffset(req.offset());
        if (req.unit() != null)          dp.setUnit(req.unit());
        if (req.minValue() != null)      dp.setMinValue(req.minValue());
        if (req.maxValue() != null)      dp.setMaxValue(req.maxValue());
        if (req.writable() != null)      dp.setWritable(req.writable());
        if (req.displayed() != null)     dp.setDisplayed(req.displayed());
        if (req.displayWidget() != null) dp.setDisplayWidget(req.displayWidget());
        dp.setDisplayGroup(req.displayGroup());
        dp.setFalseLabel(req.falseLabel());
        dp.setTrueLabel(req.trueLabel());

        return dp;
    }

    @Transactional
    public void delete(UUID profileId, UUID id) {
        profileService.findEditable(profileId);
        DataPoint dp = findInProfile(profileId, id);
        repo.delete(dp);
    }

    private PollGroup requirePollGroup(UUID profileId, UUID pollGroupId) {
        if (pollGroupId == null) throw ApiException.badRequest("Poll group is required");
        PollGroup g = pollGroupRepository.findById(pollGroupId)
            .orElseThrow(() -> ApiException.badRequest("Poll group not found"));
        if (!g.getProfile().getId().equals(profileId)) {
            throw ApiException.badRequest("Poll group does not belong to this profile");
        }
        return g;
    }
}
