package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.request.RejectEmailChangeRequest;
import com.ecoFarm.api.v1.dto.request.RequestEmailChangeRequest;
import com.ecoFarm.domain.entity.EmailChangeRequest;
import com.ecoFarm.domain.entity.User;
import com.ecoFarm.domain.enums.EmailChangeRequestStatus;
import com.ecoFarm.domain.enums.Role;
import com.ecoFarm.repository.EmailChangeRequestRepository;
import com.ecoFarm.repository.RefreshTokenRepository;
import com.ecoFarm.repository.UserRepository;
import com.ecoFarm.shared.exception.ApiException;
import com.ecoFarm.shared.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * A fallback for the self-service "change my email" flow (see
 * {@link UserService#changeEmail}) when the user can't clear its password
 * check — files a request that a tenant admin or super admin can approve
 * (applies requestedEmail) or reject. Only {@link #approve} ever actually
 * changes a user's email here; filing a request never does.
 */
@Service
@RequiredArgsConstructor
public class EmailChangeRequestService {

    private final EmailChangeRequestRepository repo;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailService emailService;

    @Value("${app.frontend.login-url}")
    private String loginUrl;

    @Transactional
    public void create(RequestEmailChangeRequest req) {
        User user = SecurityUtil.currentUser();
        String requestedEmail = req.requestedEmail().trim();

        if (requestedEmail.equals(user.getEmail())) {
            throw ApiException.badRequest("That's already your email");
        }
        if (userRepository.existsByEmail(requestedEmail)) {
            throw ApiException.conflict("Email already in use");
        }

        EmailChangeRequest request = repo.findByUserIdAndStatus(user.getId(), EmailChangeRequestStatus.PENDING)
            .orElseGet(() -> EmailChangeRequest.builder().user(user).build());
        request.setRequestedEmail(requestedEmail);
        request.setNote(req.note());
        repo.save(request);

        notifyAdmins(user, request);
    }

    private void notifyAdmins(User requester, EmailChangeRequest request) {
        List<User> tenantAdmins = userRepository.findByTenantIdAndRoleIn(
            requester.getTenant().getId(), List.of(Role.TENANT_ADMIN));
        List<User> superAdmins = userRepository.findByRole(Role.SUPER_ADMIN);
        String requesterName = String.join(" ",
            requester.getFirstName() != null ? requester.getFirstName() : "",
            requester.getLastName() != null ? requester.getLastName() : "").trim();
        String displayName = requesterName.isBlank() ? requester.getEmail() : requesterName;

        Stream.concat(tenantAdmins.stream(), superAdmins.stream())
            .distinct()
            .forEach(admin -> emailService.sendEmailChangeRequestNotification(
                admin.getEmail(), admin.getFirstName(), displayName,
                requester.getEmail(), request.getRequestedEmail(), request.getNote(), loginUrl));
    }

    @Transactional(readOnly = true)
    public List<EmailChangeRequest> listPendingForCurrentTenant() {
        return repo.findByStatusAndUser_TenantIdOrderByCreatedAtDesc(
            EmailChangeRequestStatus.PENDING, SecurityUtil.currentTenantId());
    }

    /** Applies requestedEmail to the target user and revokes their sessions
     * — same reasoning as {@link UserService#changeEmail}: their existing
     * access tokens carry the old email and would fail to authenticate at
     * all once it changes, so the sessions have to go anyway. */
    @Transactional
    public void approve(UUID id) {
        EmailChangeRequest request = findPendingInTenant(id);
        User target = request.getUser();

        if (userRepository.existsByEmail(request.getRequestedEmail())) {
            throw ApiException.conflict("That email is now in use by another account — reject this request instead");
        }

        target.setEmail(request.getRequestedEmail());
        refreshTokenRepository.revokeAllForUser(target.getId());

        request.setStatus(EmailChangeRequestStatus.APPROVED);
        request.setResolvedAt(Instant.now());
        request.setResolvedBy(SecurityUtil.currentUser());

        emailService.sendEmailChangeApprovedEmail(target.getEmail(), target.getFirstName(), loginUrl);
    }

    @Transactional
    public void reject(UUID id, RejectEmailChangeRequest req) {
        EmailChangeRequest request = findPendingInTenant(id);
        User target = request.getUser();

        request.setStatus(EmailChangeRequestStatus.REJECTED);
        request.setResolvedAt(Instant.now());
        request.setResolvedBy(SecurityUtil.currentUser());

        emailService.sendEmailChangeRejectedEmail(target.getEmail(), target.getFirstName(),
            req != null ? req.reason() : null);
    }

    private EmailChangeRequest findPendingInTenant(UUID id) {
        EmailChangeRequest request = repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("Request not found"));
        if (!request.getUser().getTenant().getId().equals(SecurityUtil.currentTenantId())) {
            throw ApiException.notFound("Request not found");
        }
        if (request.getStatus() != EmailChangeRequestStatus.PENDING) {
            throw ApiException.badRequest("This request was already resolved");
        }
        return request;
    }
}
