package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.EmailChangeRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's self-reported "I want to change my email but can't clear the
 * password check" request — sits PENDING until a tenant admin or super
 * admin approves (applies requestedEmail to the user) or rejects it.
 * Nothing about this table lets a user change their own email directly;
 * that only happens through {@link com.ecoFarm.service.EmailChangeRequestService#approve}.
 */
@Entity
@Table(name = "email_change_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "requested_email", nullable = false)
    private String requestedEmail;

    @Column(length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EmailChangeRequestStatus status = EmailChangeRequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;
}
