package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.SwitchTenantRequest;
import com.ecoFarm.api.v1.dto.response.AdminOverviewResponse;
import com.ecoFarm.api.v1.dto.response.TokenResponse;
import com.ecoFarm.service.AdminOverviewService;
import com.ecoFarm.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminOverviewService overviewService;
    private final AuthService authService;

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        return overviewService.getOverview();
    }

    @PostMapping("/switch-tenant")
    public TokenResponse switchTenant(
        @Valid @RequestBody SwitchTenantRequest req,
        @AuthenticationPrincipal UserDetails principal
    ) {
        return authService.switchTenant(req.slug(), principal.getUsername());
    }
}
