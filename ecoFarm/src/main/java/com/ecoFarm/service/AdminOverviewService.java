package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.response.AdminOverviewResponse;
import com.ecoFarm.api.v1.dto.response.GatewayResponse;
import com.ecoFarm.api.v1.mapper.GatewayMapper;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.entity.Tenant;
import com.ecoFarm.domain.enums.DeviceStatus;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.GatewayRepository;
import com.ecoFarm.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminOverviewService {

    private final TenantRepository tenantRepository;
    private final DeviceRepository deviceRepository;
    private final GatewayRepository gatewayRepository;
    private final GatewayMapper gatewayMapper;

    @Transactional(readOnly = true)
    public AdminOverviewResponse getOverview() {
        List<Tenant> tenants = tenantRepository.findAll();

        List<AdminOverviewResponse.TenantSummary> summaries = tenants.stream().map(t -> {
            List<Device> devices = deviceRepository.findByTenantId(t.getId());
            int online  = (int) devices.stream().filter(d -> d.getStatus() == DeviceStatus.ONLINE).count();
            int offline = (int) devices.stream().filter(d -> d.getStatus() == DeviceStatus.OFFLINE).count();
            return new AdminOverviewResponse.TenantSummary(
                t.getId(), t.getName(), t.getSlug(),
                devices.size(), online, offline
            );
        }).toList();

        int totalDevices = summaries.stream().mapToInt(AdminOverviewResponse.TenantSummary::deviceCount).sum();
        int totalOnline  = summaries.stream().mapToInt(AdminOverviewResponse.TenantSummary::onlineCount).sum();
        int totalOffline = summaries.stream().mapToInt(AdminOverviewResponse.TenantSummary::offlineCount).sum();

        return new AdminOverviewResponse(summaries, totalDevices, totalOnline, totalOffline);
    }

    @Transactional(readOnly = true)
    public List<GatewayResponse> getAllGateways() {
        return gatewayRepository.findAll().stream()
            .map(gatewayMapper::toResponse)
            .toList();
    }
}
