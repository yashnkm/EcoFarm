package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByTenantId(UUID tenantId);

    List<User> findByTenantIdAndRoleIn(UUID tenantId, Collection<Role> roles);

    List<User> findByRole(Role role);
}
