package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.ChannelRefRequest;
import com.ecoFarm.api.v1.dto.request.SamplingGroupRequest;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.SamplingGroup;
import com.ecoFarm.domain.entity.SamplingGroupChannel;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.SamplingGroupChannelRepository;
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
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingGroupService {

    private static final Set<Integer> ALLOWED_SAMPLE_INTERVAL_MINUTES = Set.of(1, 2, 5, 10, 15, 30, 60, 120);
    private static final Set<Integer> ALLOWED_RETENTION_DAYS = Set.of(30, 90, 180, 365);

    private final SamplingGroupRepository repo;
    private final SamplingGroupChannelRepository channelRepo;
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
        validateRateAndRetention(req);
        UUID tenantId = SecurityUtil.currentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));
        User creator = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        SamplingGroup group = SamplingGroup.builder()
            .tenant(tenant)
            .name(req.name())
            .description(req.description())
            .sampleIntervalMinutes(req.sampleIntervalMinutes())
            .retentionDays(req.retentionDays())
            .createdBy(creator)
            .build();
        group.getChannels().addAll(buildChannels(group, req.channels(), tenantId));
        return repo.save(group);
    }

    @Transactional
    public SamplingGroup update(UUID id, SamplingGroupRequest req) {
        validateRateAndRetention(req);
        SamplingGroup group = findInTenant(id);
        group.setName(req.name());
        group.setDescription(req.description());
        group.setSampleIntervalMinutes(req.sampleIntervalMinutes());
        group.setRetentionDays(req.retentionDays());
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

    private void validateRateAndRetention(SamplingGroupRequest req) {
        if (!ALLOWED_SAMPLE_INTERVAL_MINUTES.contains(req.sampleIntervalMinutes())) {
            throw ApiException.badRequest("Invalid sample interval: " + req.sampleIntervalMinutes() + " minutes");
        }
        if (req.retentionDays() != null && !ALLOWED_RETENTION_DAYS.contains(req.retentionDays())) {
            throw ApiException.badRequest("Invalid retention: " + req.retentionDays() + " days");
        }
    }

    // Every channel must belong to a device in this tenant, and can't
    // already belong to a DIFFERENT sampling group — a channel's rate and
    // retention need to be unambiguous, so it lives in exactly one group at
    // a time. update() already flushes a delete of this group's own
    // previous channels before calling this, so any row still found here
    // genuinely belongs to some other group.
    private List<SamplingGroupChannel> buildChannels(SamplingGroup group, List<ChannelRefRequest> refs, UUID tenantId) {
        List<SamplingGroupChannel> channels = new ArrayList<>();
        for (int i = 0; i < refs.size(); i++) {
            ChannelRefRequest ref = refs.get(i);
            Device device = deviceRepository.findByIdAndTenantId(ref.deviceId(), tenantId)
                .orElseThrow(() -> ApiException.badRequest("Device not found: " + ref.deviceId()));

            channelRepo.findByDevice_IdAndDataPointKey(ref.deviceId(), ref.dataPointKey())
                .ifPresent(existing -> {
                    throw ApiException.conflict(
                        "'" + ref.dataPointKey() + "' on device '" + device.getName()
                            + "' is already in another Sampling Group ('" + existing.getSamplingGroup().getName() + "')");
                });

            // Position mirrors the order channels arrive in the request —
            // i.e. the order the admin added them in the "Enabled Channels"
            // list — so re-fetching the group always shows them back in
            // that same sequence, not whatever order the DB returns rows in.
            channels.add(SamplingGroupChannel.builder()
                .samplingGroup(group)
                .device(device)
                .dataPointKey(ref.dataPointKey())
                .sortOrder(i)
                .build());
        }
        return channels;
    }
}
