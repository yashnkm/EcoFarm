package com.ecoFarm.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/** One channel (a device + one of its data point keys) within a SamplingGroup.
 * The unique constraint is deliberately NOT scoped to sampling_group_id — a
 * channel can only ever belong to one group at a time, so its recording
 * rate/retention is always unambiguous. */
@Entity
@Table(
    name = "sampling_group_channels",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_sampling_group_channel",
        columnNames = {"device_id", "data_point_key"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SamplingGroupChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sampling_group_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SamplingGroup samplingGroup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Device device;

    @Column(name = "data_point_key", nullable = false, length = 100)
    private String dataPointKey;

    /** Position within the group, in the order the admin added it —
     * SamplingGroup.channels is loaded ordered by this, so both the edit
     * dialog's "Enabled Channels" list and the Original Data table's
     * columns show up in the sequence they were deliberately added, not
     * whatever order the database happens to return rows in. */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    /** When a reading was last actually persisted for this channel — how
     * IngestionService knows whether the group's sample interval has
     * elapsed yet, without querying the (potentially huge) readings table
     * on every poll tick. Null until the first reading is recorded. */
    @Column(name = "last_recorded_at")
    private Instant lastRecordedAt;
}
