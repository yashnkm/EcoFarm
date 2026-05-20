package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.ClaimGatewayRequest;
import com.ecoFarm.api.v1.dto.request.RegisterGatewayRequest;
import com.ecoFarm.api.v1.dto.request.UpdateGatewayRequest;
import com.ecoFarm.domain.entity.*;
import com.ecoFarm.domain.enums.GatewayStatus;
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
public class GatewayService {

    private final GatewayRepository gatewayRepository;
    private final GatewayDriverRepository driverRepository;
    private final SiteRepository siteRepository;
    private final ZoneRepository zoneRepository;
    private final TenantRepository tenantRepository;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<Gateway> listForCurrentTenant() {
        return gatewayRepository.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public List<Gateway> listUnregistered() {
        return gatewayRepository.findByStatus(GatewayStatus.UNREGISTERED);
    }

    @Transactional(readOnly = true)
    public Gateway findInTenant(UUID id) {
        return gatewayRepository.findByIdAndTenantId(id, SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Gateway not found"));
    }

    @Transactional
    public Gateway register(RegisterGatewayRequest req) {
        if (gatewayRepository.findBySerialNumber(req.serialNumber()).isPresent()) {
            throw ApiException.conflict("Gateway with this serial number already exists");
        }

        Tenant tenant = tenantRepository.findById(SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        GatewayDriver driver = driverRepository.findById(req.driverId())
            .orElseThrow(() -> ApiException.badRequest("Driver not found"));

        Site site = req.siteId() != null
            ? siteRepository.findByIdAndTenantId(req.siteId(), tenant.getId())
                .orElseThrow(() -> ApiException.badRequest("Site not found"))
            : null;

        Zone zone = resolveZone(req.zoneId(), site);

        Gateway gw = Gateway.builder()
            .tenant(tenant)
            .driver(driver)
            .serialNumber(req.serialNumber())
            .mqttClientId(req.mqttClientId() != null ? req.mqttClientId() : req.serialNumber())
            .name(req.name())
            .site(site)
            .zone(zone)
            .baudRate(req.baudRate() != null ? req.baudRate() : 9600)
            .parity(req.parity() != null ? req.parity() : "none")
            .stopBits(req.stopBits() != null ? req.stopBits() : 1)
            .status(site != null ? GatewayStatus.OFFLINE : GatewayStatus.UNREGISTERED)
            .build();

        return gatewayRepository.save(gw);
    }

    @Transactional
    public Gateway claim(UUID id, ClaimGatewayRequest req) {
        Gateway gw = gatewayRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Gateway not found"));

        if (gw.getStatus() != GatewayStatus.UNREGISTERED) {
            throw ApiException.badRequest("Gateway is already claimed");
        }

        Tenant tenant = tenantRepository.findById(SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        Site site = siteRepository.findByIdAndTenantId(req.siteId(), tenant.getId())
            .orElseThrow(() -> ApiException.badRequest("Site not found"));

        gw.setTenant(tenant);
        gw.setSite(site);
        gw.setZone(resolveZone(req.zoneId(), site));
        gw.setName(req.name());
        gw.setStatus(GatewayStatus.OFFLINE);
        return gw;
    }

    @Transactional
    public Gateway update(UUID id, UpdateGatewayRequest req) {
        Gateway gw = findInTenant(id);
        if (req.name() != null) gw.setName(req.name());

        if (req.siteId() != null) {
            Site site = siteRepository.findByIdAndTenantId(req.siteId(), gw.getTenant().getId())
                .orElseThrow(() -> ApiException.badRequest("Site not found"));
            gw.setSite(site);
            gw.setZone(null); // zone must match new site
        }

        if (req.zoneId() != null) {
            gw.setZone(resolveZone(req.zoneId(), gw.getSite()));
        }

        if (req.baudRate() != null) gw.setBaudRate(req.baudRate());
        if (req.parity()   != null) gw.setParity(req.parity());
        if (req.stopBits() != null) gw.setStopBits(req.stopBits());

        return gw;
    }

    @Transactional
    public void delete(UUID id) {
        Gateway gw = findInTenant(id);

        // Cascade: everything that belongs to this gateway's devices, then the
        // devices themselves, then gateway-scoped logs, then the gateway.
        em.createNativeQuery("DELETE FROM readings WHERE gateway_id = :gid")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alerts WHERE device_id IN (SELECT id FROM devices WHERE gateway_id = :gid)")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alert_rules WHERE device_id IN (SELECT id FROM devices WHERE gateway_id = :gid)")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM control_commands WHERE device_id IN (SELECT id FROM devices WHERE gateway_id = :gid)")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM communication_logs WHERE gateway_id = :gid")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM system_event_logs WHERE gateway_id = :gid")
          .setParameter("gid", gw.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM devices WHERE gateway_id = :gid")
          .setParameter("gid", gw.getId()).executeUpdate();

        gatewayRepository.delete(gw);
    }

    private Zone resolveZone(UUID zoneId, Site site) {
        if (zoneId == null) return null;
        Zone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> ApiException.badRequest("Zone not found"));
        if (site == null || !zone.getSite().getId().equals(site.getId())) {
            throw ApiException.badRequest("Zone does not belong to the specified site");
        }
        return zone;
    }
}
