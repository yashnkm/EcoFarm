package com.ecoFarm.repository;

import com.ecoFarm.domain.entity.EmailChangeRequest;
import com.ecoFarm.domain.enums.EmailChangeRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailChangeRequestRepository extends JpaRepository<EmailChangeRequest, UUID> {

    Optional<EmailChangeRequest> findByUserIdAndStatus(UUID userId, EmailChangeRequestStatus status);

    List<EmailChangeRequest> findByStatusAndUser_TenantIdOrderByCreatedAtDesc(
        EmailChangeRequestStatus status, UUID tenantId);
}
