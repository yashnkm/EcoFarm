package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.GatewayDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GatewayDriverRepository extends JpaRepository<GatewayDriver, UUID> {

    Optional<GatewayDriver> findByName(String name);
}
