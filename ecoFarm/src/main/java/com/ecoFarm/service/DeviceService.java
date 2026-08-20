package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateDeviceRequest;
import com.ecoFarm.api.v1.dto.request.DataPointGroupsRequest;
import com.ecoFarm.api.v1.dto.request.IssueCommandRequest;
import com.ecoFarm.api.v1.dto.request.RecordedDataPointsRequest;
import com.ecoFarm.api.v1.dto.request.UpdateDeviceRequest;
import com.ecoFarm.domain.entity.*;
import com.ecoFarm.domain.enums.CommandStatus;
import com.ecoFarm.domain.enums.DeviceProtocol;
import com.ecoFarm.domain.enums.DeviceStatus;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.*;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final GatewayRepository gatewayRepository;
    private final DeviceProfileRepository profileRepository;
    private final ZoneRepository zoneRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final ControlCommandRepository controlCommandRepository;
    private final ReadingRepository readingRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<Device> listForCurrentTenant() {
        return deviceRepository.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public List<Device> listForGateway(UUID gatewayId) {
        return deviceRepository.findByGatewayId(gatewayId);
    }

    @Transactional(readOnly = true)
    public Device findInTenant(UUID id) {
        return deviceRepository.findByIdAndTenantId(id, SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Device not found"));
    }

    @Transactional
    public Device create(CreateDeviceRequest req) {
        UUID tenantId = SecurityUtil.currentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        Gateway gateway = gatewayRepository.findByIdAndTenantId(req.gatewayId(), tenantId)
            .orElseThrow(() -> ApiException.badRequest("Gateway not found"));

        DeviceProfile profile = profileRepository.findById(req.profileId())
            .orElseThrow(() -> ApiException.badRequest("Device profile not found"));

        // Profile must be global or belong to this tenant
        if (profile.getTenant() != null && !profile.getTenant().getId().equals(tenantId)) {
            throw ApiException.forbidden("Cannot use another tenant's device profile");
        }

        if (deviceRepository.findByGatewayIdAndSlaveId(gateway.getId(), req.slaveId()).isPresent()) {
            throw ApiException.conflict("Slave ID already in use on this gateway");
        }

        Zone zone = resolveZone(req.zoneId(), gateway.getSite());

        Device device = Device.builder()
            .tenant(tenant)
            .gateway(gateway)
            .site(gateway.getSite())
            .zone(zone)
            .profile(profile)
            .name(req.name())
            .slaveId(req.slaveId())
            .protocol(req.protocol() != null ? req.protocol() : DeviceProtocol.RTU)
            .ipAddress(req.ipAddress())
            .port(req.port())
            .timeoutSeconds(req.timeoutSeconds() != null ? req.timeoutSeconds() : 5)
            .status(DeviceStatus.OFFLINE)
            .build();

        return deviceRepository.save(device);
    }

    @Transactional
    public Device update(UUID id, UpdateDeviceRequest req) {
        Device device = findInTenant(id);
        if (req.name() != null)            device.setName(req.name());
        if (req.protocol() != null)        device.setProtocol(req.protocol());
        if (req.ipAddress() != null)       device.setIpAddress(req.ipAddress());
        if (req.port() != null)            device.setPort(req.port());
        if (req.zoneId() != null) {
            Zone zone = resolveZone(req.zoneId(), device.getSite());
            device.setZone(zone);
            if (device.getSite() == null && zone != null) {
                device.setSite(zone.getSite());
            }
        } else if (Boolean.TRUE.equals(req.clearZone())) {
            device.setZone(null);
        }
        if (req.timeoutSeconds() != null)  device.setTimeoutSeconds(req.timeoutSeconds());
        return device;
    }

    @Transactional
    public void delete(UUID id) {
        Device device = findInTenant(id);

        // Cascade children of this device: readings, commands, alerts, alert_rules.
        // Using native queries for bulk deletes — readings can be millions of rows.
        em.createNativeQuery("DELETE FROM readings WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alerts WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alert_rules WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM control_commands WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM communication_logs WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM system_event_logs WHERE device_id = :id")
          .setParameter("id", device.getId()).executeUpdate();

        deviceRepository.delete(device);
    }

    @Transactional
    public ControlCommand issueCommand(UUID deviceId, IssueCommandRequest req) {
        Device device = findInTenant(deviceId);

        CommandTemplate template = commandTemplateRepository.findById(req.commandTemplateId())
            .orElseThrow(() -> ApiException.badRequest("Command template not found"));

        if (!template.getProfile().getId().equals(device.getProfile().getId())) {
            throw ApiException.badRequest("Command does not belong to this device's profile");
        }

        Role userRole = SecurityUtil.currentUser().getRole();
        if (!hasMinimumRole(userRole, template.getMinRole())) {
            throw ApiException.forbidden("Insufficient role to issue this command");
        }

        User issuer = userRepository.findById(SecurityUtil.currentUserId())
            .orElseThrow(() -> ApiException.notFound("User not found"));

        int value;
        if (template.getOffValue() != null) {
            // Toggle command — resolve direction from the linked status data
            // point's latest reading, never from anything the client sends.
            // No reading yet (or no status point configured) reads as "off",
            // so the first click always turns it on rather than guessing.
            boolean currentlyOn = template.getStatusDataPointKey() != null
                && readingRepository.findFirstByDeviceIdAndDataPointOrderByTimeDesc(deviceId, template.getStatusDataPointKey())
                    .map(r -> r.getValue() != null && r.getValue() > 0)
                    .orElse(false);
            value = currentlyOn ? template.getOffValue() : template.getValue();
        } else if (template.isPromptForValue()) {
            if (req.value() == null) {
                throw ApiException.badRequest("This command requires a value");
            }
            value = req.value();
        } else {
            // Fixed commands always send their configured value — a client
            // can never override it, even if one was supplied.
            value = template.getValue();
        }

        ControlCommand cmd = ControlCommand.builder()
            .tenant(device.getTenant())
            .device(device)
            .issuedBy(issuer)
            .registerNumber(template.getRegisterNumber())
            .functionCode(template.getFunctionCode())
            .value(value)
            .status(CommandStatus.PENDING)
            .build();

        return controlCommandRepository.save(cmd);
        // MQTT dispatcher will pick this up (when built) and publish to the gateway.
    }

    @Transactional
    public Device updateRecordedDataPoints(UUID id, RecordedDataPointsRequest req) {
        Device device = findInTenant(id);
        device.setRecordedDataPoints(req.dataPoints());
        return device;
    }

    @Transactional
    public Device updateDataPointGroups(UUID id, DataPointGroupsRequest req) {
        Device device = findInTenant(id);
        device.setDataPointGroups(req.dataPointGroups());
        return device;
    }

    @Transactional(readOnly = true)
    public List<ControlCommand> listCommands(UUID deviceId) {
        findInTenant(deviceId);
        return controlCommandRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId);
    }

    private Zone resolveZone(UUID zoneId, Site site) {
        if (zoneId == null) return null;
        Zone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> ApiException.badRequest("Zone not found"));
        if (site != null && !zone.getSite().getId().equals(site.getId())) {
            throw ApiException.badRequest("Zone does not belong to the device's site");
        }
        return zone;
    }

    /** Role hierarchy: SUPER_ADMIN > TENANT_ADMIN > OPERATOR > VIEWER */
    private boolean hasMinimumRole(Role userRole, Role required) {
        int userLevel = roleLevel(userRole);
        int reqLevel = roleLevel(required);
        return userLevel >= reqLevel;
    }

    private int roleLevel(Role role) {
        return switch (role) {
            case SUPER_ADMIN   -> 4;
            case TENANT_ADMIN  -> 3;
            case OPERATOR      -> 2;
            case VIEWER        -> 1;
        };
    }
}
