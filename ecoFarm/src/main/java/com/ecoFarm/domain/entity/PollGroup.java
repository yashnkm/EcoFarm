package com.ecoFarm.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "poll_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private DeviceProfile profile;

    @Column(nullable = false)
    private String name;

    @Column(name = "interval_seconds", nullable = false)
    @Builder.Default
    private Integer intervalSeconds = 10;

    @Column(name = "start_register", nullable = false)
    private Integer startRegister;

    @Column(nullable = false)
    private Integer count;

    @Column(name = "function_code", nullable = false)
    private Integer functionCode;
}
