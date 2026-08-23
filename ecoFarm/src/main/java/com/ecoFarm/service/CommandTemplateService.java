package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CommandTemplateRequest;
import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DataPointRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommandTemplateService {

    private final CommandTemplateRepository repo;
    private final DataPointRepository dataPointRepository;
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

        if (repo.findByProfileIdAndName(profileId, req.name()).isPresent()) {
            throw ApiException.conflict("A command with this name already exists in the profile");
        }
        if (req.key() == null || req.key().isBlank()) {
            throw ApiException.badRequest("Key is required");
        }
        if (repo.findByProfileIdAndKey(profileId, req.key()).isPresent()) {
            throw ApiException.conflict("A command with this key already exists in the profile");
        }
        requireStatusDataPointExists(profileId, req.statusDataPointKey());
        requireNonZeroScale(req.scaleFactor());

        CommandTemplate c = CommandTemplate.builder()
            .profile(profile)
            .name(req.name())
            .key(req.key())
            .description(req.description())
            .registerNumber(req.registerNumber())
            .functionCode(req.functionCode())
            .value(req.value())
            .confirmationRequired(req.confirmationRequired() == null || req.confirmationRequired())
            .minRole(req.minRole() != null ? req.minRole() : Role.OPERATOR)
            .promptForValue(Boolean.TRUE.equals(req.promptForValue()))
            .offValue(req.offValue())
            .statusDataPointKey(req.statusDataPointKey())
            .category(req.category())
            .scaleFactor(req.scaleFactor() != null ? req.scaleFactor() : BigDecimal.ONE)
            .offset(req.offset() != null ? req.offset() : BigDecimal.ZERO)
            .unit(req.unit())
            .build();
        return repo.save(c);
    }

    @Transactional
    public CommandTemplate update(UUID profileId, UUID id, CommandTemplateRequest req) {
        profileService.findEditable(profileId);
        CommandTemplate c = findInProfile(profileId, id);

        if (!c.getName().equals(req.name())
            && repo.findByProfileIdAndName(profileId, req.name()).isPresent()) {
            throw ApiException.conflict("A command with this name already exists in the profile");
        }
        // Key wasn't required on commands created before this field existed —
        // editing one of those without setting a key is still allowed. Only
        // guard against colliding with a key some other command already has.
        if (req.key() != null && !req.key().isBlank()
            && !req.key().equals(c.getKey())
            && repo.findByProfileIdAndKey(profileId, req.key()).isPresent()) {
            throw ApiException.conflict("A command with this key already exists in the profile");
        }
        requireStatusDataPointExists(profileId, req.statusDataPointKey());
        requireNonZeroScale(req.scaleFactor());

        c.setName(req.name());
        c.setKey(req.key() != null && !req.key().isBlank() ? req.key() : c.getKey());
        c.setDescription(req.description());
        c.setRegisterNumber(req.registerNumber());
        c.setFunctionCode(req.functionCode());
        c.setValue(req.value());
        if (req.confirmationRequired() != null) c.setConfirmationRequired(req.confirmationRequired());
        if (req.minRole() != null) c.setMinRole(req.minRole());
        if (req.promptForValue() != null) c.setPromptForValue(req.promptForValue());
        c.setOffValue(req.offValue());
        c.setStatusDataPointKey(req.statusDataPointKey());
        c.setCategory(req.category());
        c.setScaleFactor(req.scaleFactor() != null ? req.scaleFactor() : BigDecimal.ONE);
        c.setOffset(req.offset() != null ? req.offset() : BigDecimal.ZERO);
        c.setUnit(req.unit());
        return c;
    }

    private void requireNonZeroScale(BigDecimal scaleFactor) {
        if (scaleFactor != null && scaleFactor.compareTo(BigDecimal.ZERO) == 0) {
            throw ApiException.badRequest("Scale factor cannot be zero");
        }
    }

    // A toggle's statusDataPointKey is a free-text key (matches how
    // dataPointGroups/commandGroups already work), not a real FK — so a typo
    // here doesn't fail loudly. It silently means the toggle can never read
    // real state (always shows "Unknown", always resolves to sending ON).
    // Checking it against the profile's real data points at save time turns
    // that into a clear error instead of a live-dashboard mystery.
    private void requireStatusDataPointExists(UUID profileId, String statusDataPointKey) {
        if (statusDataPointKey == null || statusDataPointKey.isBlank()) return;
        if (dataPointRepository.findByProfileIdAndKey(profileId, statusDataPointKey).isEmpty()) {
            throw ApiException.badRequest(
                "Status data point '" + statusDataPointKey + "' does not exist in this profile");
        }
    }

    @Transactional
    public void delete(UUID profileId, UUID id) {
        profileService.findEditable(profileId);
        CommandTemplate c = findInProfile(profileId, id);
        repo.delete(c);
    }
}
