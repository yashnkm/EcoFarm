package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateDeviceProfileRequest;
import com.ecoFarm.api.v1.dto.request.UpdateDeviceProfileRequest;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.DeviceCategory;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DataPointRepository;
import com.ecoFarm.repository.DeviceProfileRepository;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.PollGroupRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceProfileService {

    private final DeviceProfileRepository profileRepository;
    private final TenantRepository tenantRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final DataPointRepository dataPointRepository;
    private final PollGroupRepository pollGroupRepository;
    private final DeviceRepository deviceRepository;

    @Transactional(readOnly = true)
    public List<DeviceProfile> listAvailable() {
        return profileRepository.findAllAvailableForTenant(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public DeviceProfile findAvailable(UUID id) {
        DeviceProfile p = profileRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Device profile not found"));

        // Must be global (tenant == null) or belong to current tenant
        if (p.getTenant() != null && !p.getTenant().getId().equals(SecurityUtil.currentTenantId())) {
            throw ApiException.notFound("Device profile not found");
        }
        return p;
    }

    @Transactional
    public DeviceProfile create(CreateDeviceProfileRequest req) {
        User currentUser = SecurityUtil.currentUser();

        Tenant tenant;
        if (Boolean.TRUE.equals(req.global())) {
            if (currentUser.getRole() != Role.SUPER_ADMIN) {
                throw ApiException.forbidden("Only super admins can create global profiles");
            }
            tenant = null;
        } else {
            tenant = tenantRepository.findById(SecurityUtil.currentTenantId())
                .orElseThrow(() -> ApiException.notFound("Tenant not found"));
        }

        DeviceProfile p = DeviceProfile.builder()
            .tenant(tenant)
            .name(req.name())
            .manufacturer(req.manufacturer())
            .model(req.model())
            .category(req.category() != null ? req.category() : DeviceCategory.PLC)
            .description(req.description())
            .createdBy(currentUser)
            .build();

        return profileRepository.save(p);
    }

    @Transactional
    public DeviceProfile update(UUID id, UpdateDeviceProfileRequest req) {
        DeviceProfile p = findEditable(id);
        if (req.name() != null)         p.setName(req.name());
        if (req.manufacturer() != null) p.setManufacturer(req.manufacturer());
        if (req.model() != null)        p.setModel(req.model());
        if (req.category() != null)     p.setCategory(req.category());
        if (req.description() != null)  p.setDescription(req.description());
        return p;
    }

    @Transactional
    public void delete(UUID id) {
        DeviceProfile p = findEditable(id);

        // Refuse if any device still uses this profile — user must reassign/remove first
        long inUse = deviceRepository.findAll().stream()
            .filter(d -> d.getProfile().getId().equals(p.getId()))
            .count();
        if (inUse > 0) {
            throw ApiException.conflict(
                inUse + " device(s) still use this profile. Remove or reassign them first.");
        }

        // Cascade: commands → data_points → poll_groups → profile
        commandTemplateRepository.findByProfileId(p.getId())
            .forEach(commandTemplateRepository::delete);
        dataPointRepository.findByProfileId(p.getId())
            .forEach(dataPointRepository::delete);
        pollGroupRepository.findByProfileId(p.getId())
            .forEach(pollGroupRepository::delete);

        profileRepository.delete(p);
    }

    /** Used by nested resource services (poll groups, data points, commands) */
    @Transactional(readOnly = true)
    public DeviceProfile findEditable(UUID id) {
        DeviceProfile p = profileRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Device profile not found"));

        Role role = SecurityUtil.currentUser().getRole();

        if (p.getTenant() == null) {
            // Global profile — only super admin can edit
            if (role != Role.SUPER_ADMIN) {
                throw ApiException.forbidden("Only super admins can edit global profiles");
            }
        } else {
            // Tenant profile — must match current tenant
            if (!p.getTenant().getId().equals(SecurityUtil.currentTenantId())) {
                throw ApiException.notFound("Device profile not found");
            }
        }
        return p;
    }
}
