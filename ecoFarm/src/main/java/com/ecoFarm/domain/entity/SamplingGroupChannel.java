package com.ecoFarm.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** One channel (a device + one of its data point keys) within a SamplingGroup. */
@Entity
@Table(
    name = "sampling_group_channels",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_sampling_group_channel",
        columnNames = {"sampling_group_id", "device_id", "data_point_key"}
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
}
