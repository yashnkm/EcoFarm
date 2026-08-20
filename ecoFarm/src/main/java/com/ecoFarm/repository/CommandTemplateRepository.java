package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.CommandTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommandTemplateRepository extends JpaRepository<CommandTemplate, UUID> {

    List<CommandTemplate> findByProfileId(UUID profileId);

    Optional<CommandTemplate> findByProfileIdAndName(UUID profileId, String name);
}
