package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "command_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommandTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private DeviceProfile profile;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "register_number", nullable = false)
    private Integer registerNumber;

    @Column(name = "function_code", nullable = false)
    private Integer functionCode;

    @Column(nullable = false)
    private Integer value;

    @Column(name = "confirmation_required", nullable = false)
    @Builder.Default
    private boolean confirmationRequired = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "min_role", nullable = false, length = 30)
    @Builder.Default
    private Role minRole = Role.OPERATOR;
}
