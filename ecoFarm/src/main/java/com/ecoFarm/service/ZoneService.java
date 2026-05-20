package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.CreateZoneRequest;
import com.ecoFarm.api.v1.dto.request.UpdateZoneRequest;
import com.ecoFarm.domain.entity.Site;
import com.ecoFarm.domain.entity.Zone;
import com.ecoFarm.repository.ZoneRepository;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final SiteService siteService;

    @Transactional(readOnly = true)
    public List<Zone> listForSite(UUID siteId) {
        siteService.findInTenant(siteId); // tenant isolation check
        return zoneRepository.findBySiteId(siteId);
    }

    @Transactional(readOnly = true)
    public Zone findInSite(UUID siteId, UUID zoneId) {
        siteService.findInTenant(siteId);
        Zone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> ApiException.notFound("Zone not found"));
        if (!zone.getSite().getId().equals(siteId)) {
            throw ApiException.notFound("Zone not found");
        }
        return zone;
    }

    @Transactional
    public Zone create(UUID siteId, CreateZoneRequest req) {
        Site site = siteService.findInTenant(siteId);
        Zone zone = Zone.builder()
            .site(site)
            .name(req.name())
            .description(req.description())
            .build();
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone update(UUID siteId, UUID zoneId, UpdateZoneRequest req) {
        Zone zone = findInSite(siteId, zoneId);
        if (req.name() != null) zone.setName(req.name());
        if (req.description() != null) zone.setDescription(req.description());
        return zone;
    }

    @Transactional
    public void delete(UUID siteId, UUID zoneId) {
        Zone zone = findInSite(siteId, zoneId);
        zoneRepository.delete(zone);
    }
}
