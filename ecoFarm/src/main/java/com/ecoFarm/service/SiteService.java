package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateSiteRequest;
import com.ecoFarm.api.v1.dto.request.UpdateSiteRequest;
import com.ecoFarm.domain.entity.Site;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.repository.SiteRepository;
import com.ecoFarm.repository.TenantRepository;
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
public class SiteService {

    private final SiteRepository siteRepository;
    private final TenantRepository tenantRepository;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<Site> listForCurrentTenant() {
        return siteRepository.findByTenantId(SecurityUtil.currentTenantId());
    }

    @Transactional(readOnly = true)
    public Site findInTenant(UUID id) {
        return siteRepository.findByIdAndTenantId(id, SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Site not found"));
    }

    @Transactional
    public Site create(CreateSiteRequest req) {
        Tenant tenant = tenantRepository.findById(SecurityUtil.currentTenantId())
            .orElseThrow(() -> ApiException.notFound("Tenant not found"));

        Site site = Site.builder()
            .tenant(tenant)
            .name(req.name())
            .address(req.address())
            .lat(req.lat())
            .lng(req.lng())
            .timezone(req.timezone() != null ? req.timezone() : "UTC")
            .build();

        return siteRepository.save(site);
    }

    @Transactional
    public Site update(UUID id, UpdateSiteRequest req) {
        Site site = findInTenant(id);
        if (req.name() != null)     site.setName(req.name());
        if (req.address() != null)  site.setAddress(req.address());
        if (req.lat() != null)      site.setLat(req.lat());
        if (req.lng() != null)      site.setLng(req.lng());
        if (req.timezone() != null) site.setTimezone(req.timezone());
        if (req.status() != null)   site.setStatus(req.status());
        return site;
    }

    @Transactional
    public void delete(UUID id) {
        Site site = findInTenant(id);

        // Cascade everything under the site: readings → alerts/rules → commands
        // → devices → gateways → zones → site itself.
        em.createNativeQuery("DELETE FROM readings WHERE site_id = :sid")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alerts WHERE device_id IN (SELECT id FROM devices WHERE site_id = :sid)")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM alert_rules WHERE device_id IN (SELECT id FROM devices WHERE site_id = :sid)")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM control_commands WHERE device_id IN (SELECT id FROM devices WHERE site_id = :sid)")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM communication_logs WHERE gateway_id IN (SELECT id FROM gateways WHERE site_id = :sid)")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM system_event_logs WHERE site_id = :sid")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM devices WHERE site_id = :sid")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM gateways WHERE site_id = :sid")
          .setParameter("sid", site.getId()).executeUpdate();
        em.createNativeQuery("DELETE FROM zones WHERE site_id = :sid")
          .setParameter("sid", site.getId()).executeUpdate();

        siteRepository.delete(site);
    }
}
