package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.ChannelRefRequest;
import com.ecoFarm.api.v1.dto.request.SamplingGroupRequest;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.SamplingGroup;
import com.ecoFarm.domain.entity.SamplingGroupChannel;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.SamplingGroupRepository;
import com.ecoFarm.repository.TenantRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingGroupService {

    private final SamplingGroupRepository repo;
    private final TenantRepository tenantRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SamplingGroup> list() {
        return repo.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public SamplingGroup findInTenant(UUID id) {
        return repo.findByIdAndTenantId(id, SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Sampling group not found"));
    }

    @Transactional
    public SamplingGroup create(SamplingGroupRequest req) {
        UUID tenantId = SecurityUtil.currentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));
        User creator = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        SamplingGroup group = SamplingGroup.builder()
            .tenant(tenant)
            .name(req.name())
            .description(req.description())
            .createdBy(creator)
            .build();
        group.getChannels().addAll(buildChannels(group, req.channels(), tenantId));
        return repo.save(group);
    }

    @Transactional
    public SamplingGroup update(UUID id, SamplingGroupRequest req) {
        SamplingGroup group = findInTenant(id);
        group.setName(req.name());
        group.setDescription(req.description());
        // orphanRemoval on the entity deletes anything cleared here that
        // isn't in the replacement list — a full replace, not a diff/patch.
        group.getChannels().clear();
        // Flush the deletes before adding replacement rows — otherwise a
        // channel that's unchanged (same device+key kept across the update)
        // gets re-inserted as a new row before the old one's DELETE has
        // actually run, and collides with it on the unique constraint.
        repo.saveAndFlush(group);
        group.getChannels().addAll(buildChannels(group, req.channels(), SecurityUtil.currentTenantId()));
        return group;
    }

    @Transactional
    public void delete(UUID id) {
        repo.delete(findInTenant(id));
    }

    // Every channel must belong to a device in this tenant AND already have
    // recording enabled on that device — reuses the existing "Record" toggle
    // (Device.recordedDataPoints) instead of a separate eligibility flag, and
    // enforces it server-side so this can't be bypassed by calling the API
    // directly with an unrecorded key that would never actually have readings.
    private List<SamplingGroupChannel> buildChannels(SamplingGroup group, List<ChannelRefRequest> refs, UUID tenantId) {
        List<SamplingGroupChannel> channels = new ArrayList<>();
        for (ChannelRefRequest ref : refs) {
            Device device = deviceRepository.findByIdAndTenantId(ref.deviceId(), tenantId)
                .orElseThrow(() -> ApiException.badRequest("Device not found: " + ref.deviceId()));
            if (!device.getRecordedDataPoints().contains(ref.dataPointKey())) {
                throw ApiException.badRequest(
                    "'" + ref.dataPointKey() + "' on device '" + device.getName()
                        + "' does not have recording enabled — enable it on the device first");
            }
            channels.add(SamplingGroupChannel.builder()
                .samplingGroup(group)
                .device(device)
                .dataPointKey(ref.dataPointKey())
                .build());
        }
        return channels;
    }
}
