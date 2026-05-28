package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.PollGroupRequest;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.entity.PollGroup;
import com.ecoFarm.repository.PollGroupRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PollGroupService {

    private final PollGroupRepository repo;
    private final DeviceProfileService profileService;

    @Transactional(readOnly = true)
    public List<PollGroup> list(UUID profileId) {
        profileService.findAvailable(profileId);
        return repo.findByProfileId(profileId);
    }

    @Transactional(readOnly = true)
    public PollGroup findInProfile(UUID profileId, UUID id) {
        profileService.findAvailable(profileId);
        PollGroup g = repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("Poll group not found"));
        if (!g.getProfile().getId().equals(profileId)) {
            throw ApiException.notFound("Poll group not found");
        }
        return g;
    }

    @Transactional
    public PollGroup create(UUID profileId, PollGroupRequest req) {
        DeviceProfile profile = profileService.findEditable(profileId);
        PollGroup g = PollGroup.builder()
            .profile(profile)
            .name(req.name())
            .intervalSeconds(req.intervalSeconds())
            .startRegister(req.startRegister())
            .count(req.count())
            .functionCode(req.functionCode())
            .build();
        return repo.save(g);
    }

    @Transactional
    public PollGroup update(UUID profileId, UUID id, PollGroupRequest req) {
        profileService.findEditable(profileId); // auth check
        PollGroup g = findInProfile(profileId, id);
        g.setName(req.name());
        g.setIntervalSeconds(req.intervalSeconds());
        g.setStartRegister(req.startRegister());
        g.setCount(req.count());
        g.setFunctionCode(req.functionCode());
        return g;
    }

    @Transactional
    public void delete(UUID profileId, UUID id) {
        profileService.findEditable(profileId);
        PollGroup g = findInProfile(profileId, id);
        repo.delete(g);
    }
}
