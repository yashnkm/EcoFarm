package com.ecoFarm.security;

import com.ecoFarm.domain.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
public class UserPrincipal implements UserDetails {

    private final User user;
    private final UUID activeTenantId;

    public UserPrincipal(User user) {
        this.user = user;
        this.activeTenantId = user.getTenant().getId();
    }

    public UserPrincipal(User user, UUID activeTenantId) {
        this.user = user;
        this.activeTenantId = activeTenantId;
    }

    public UUID getId() { return user.getId(); }

    public UUID getTenantId() { return activeTenantId; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override public String getPassword() { return user.getPasswordHash(); }
    @Override public String getUsername() { return user.getEmail(); }

    @Override
    public boolean isEnabled() {
        return user.getStatus() == com.ecoFarm.domain.enums.UserStatus.ACTIVE;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != com.ecoFarm.domain.enums.UserStatus.SUSPENDED;
    }
}
