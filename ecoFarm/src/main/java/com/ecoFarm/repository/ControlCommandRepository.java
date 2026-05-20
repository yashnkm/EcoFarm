package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.ControlCommand;
import com.ecoFarm.domain.enums.CommandStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ControlCommandRepository extends JpaRepository<ControlCommand, UUID> {

    List<ControlCommand> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);

    List<ControlCommand> findByStatus(CommandStatus status);
}
