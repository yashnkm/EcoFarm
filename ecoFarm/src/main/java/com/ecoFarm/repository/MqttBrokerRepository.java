package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.MqttBroker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MqttBrokerRepository extends JpaRepository<MqttBroker, UUID> {
    Optional<MqttBroker> findByName(String name);
    boolean existsByName(String name);
}
