package com.ecoFarm.shared.util;

import com.ecoFarm.domain.entity.User;
import com.ecoFarm.security.UserPrincipal;
import com.ecoFarm.shared.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtil {

    private SecurityUtil() {}

    public static UserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal p)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return p;
    }

    public static User currentUser() {
        return currentPrincipal().getUser();
    }

    public static UUID currentUserId() {
        return currentPrincipal().getId();
    }

    public static UUID currentTenantId() {
        return currentPrincipal().getTenantId();
    }
}
