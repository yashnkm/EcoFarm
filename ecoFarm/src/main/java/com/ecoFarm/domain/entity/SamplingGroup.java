package com.ecoFarm.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A named, user-defined set of data-point channels to record and view
 * together on the Data Log page — independent of Poll Groups (which govern
 * polling, not recording) so an admin can mix channels from different
 * devices/sites into one chart. This is now the *only* thing that makes
 * IngestionService actually persist a reading for a channel — being in a
 * SamplingGroup at some rate, for some retention window, is what "recording"
 * means; there's no separate per-device opt-in anymore. A channel belongs to
 * at most one group at a time (enforced by a DB-level unique constraint on
 * device_id+data_point_key in SamplingGroupChannel, not scoped per-group).
 */
@Entity
@Table(name = "sampling_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SamplingGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Tenant tenant;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** How often (in minutes) a fresh reading actually gets persisted for
     * this group's channels — IngestionService still polls at whatever rate
     * the device's Poll Group is set to, this just throttles how much of
     * that gets written to history. One of 1/2/5/10/15/30/60/120, enforced
     * in SamplingGroupService, not here. */
    @Column(name = "sample_interval_minutes", nullable = false)
    private Integer sampleIntervalMinutes;

    /** Days of history to keep for this group's channels; null = forever.
     * One of 30/90/180/365/null, enforced in SamplingGroupService. */
    @Column(name = "retention_days")
    private Integer retentionDays;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "samplingGroup", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<SamplingGroupChannel> channels = new ArrayList<>();
}
