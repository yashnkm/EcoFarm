package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CommandTemplateRequest;
import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommandTemplateService {

    private final CommandTemplateRepository repo;
    private final DeviceProfileService profileService;

    @Transactional(readOnly = true)
    public List<CommandTemplate> list(UUID profileId) {
        profileService.findAvailable(profileId);
        return repo.findByProfileId(profileId);
    }

    @Transactional(readOnly = true)
    public CommandTemplate findInProfile(UUID profileId, UUID id) {
        profileService.findAvailable(profileId);
        CommandTemplate c = repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("Command template not found"));
        if (!c.getProfile().getId().equals(profileId)) {
            throw ApiException.notFound("Command template not found");
        }
        return c;
    }

    @Transactional
    public CommandTemplate create(UUID profileId, CommandTemplateRequest req) {
        DeviceProfile profile = profileService.findEditable(profileId);
        CommandTemplate c = CommandTemplate.builder()
            .profile(profile)
            .name(req.name())
            .description(req.description())
            .registerNumber(req.registerNumber())
            .functionCode(req.functionCode())
            .value(req.value())
            .confirmationRequired(req.confirmationRequired() == null || req.confirmationRequired())
            .minRole(req.minRole() != null ? req.minRole() : Role.OPERATOR)
            .promptForValue(Boolean.TRUE.equals(req.promptForValue()))
            .offValue(req.offValue())
            .statusDataPointKey(req.statusDataPointKey())
            .build();
        return repo.save(c);
    }

    @Transactional
    public CommandTemplate update(UUID profileId, UUID id, CommandTemplateRequest req) {
        profileService.findEditable(profileId);
        CommandTemplate c = findInProfile(profileId, id);
        c.setName(req.name());
        c.setDescription(req.description());
        c.setRegisterNumber(req.registerNumber());
        c.setFunctionCode(req.functionCode());
        c.setValue(req.value());
        if (req.confirmationRequired() != null) c.setConfirmationRequired(req.confirmationRequired());
        if (req.minRole() != null) c.setMinRole(req.minRole());
        if (req.promptForValue() != null) c.setPromptForValue(req.promptForValue());
        c.setOffValue(req.offValue());
        c.setStatusDataPointKey(req.statusDataPointKey());
        return c;
    }

    @Transactional
    public void delete(UUID profileId, UUID id) {
        profileService.findEditable(profileId);
        CommandTemplate c = findInProfile(profileId, id);
        repo.delete(c);
    }
}
