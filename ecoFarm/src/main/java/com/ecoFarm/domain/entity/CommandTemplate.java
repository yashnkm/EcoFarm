package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.CommandCategory;
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

    /** When true, {@code value} is a placeholder — the operator supplies the
     * actual value at send-time (setpoints), instead of always sending the
     * same fixed number (plain ON/OFF commands). */
    @Column(name = "prompt_for_value", nullable = false)
    @Builder.Default
    private boolean promptForValue = false;

    /** Non-null marks this as a toggle command: {@code value} is the ON value,
     * this is the OFF value — both written to the same register. Which one
     * actually gets sent is resolved server-side from {@link #statusDataPointKey}'s
     * latest reading, never supplied by the client. */
    @Column(name = "off_value")
    private Integer offValue;

    /** The data point (by key, within the same profile) whose latest reading
     * says whether this toggle is currently on — e.g. "fan_3". Null means the
     * current state is unknown, so a toggle always resolves to the ON value. */
    @Column(name = "status_data_point_key", length = 100)
    private String statusDataPointKey;

    /** Explicit dashboard grouping for non-toggle commands (setpoints etc.) —
     * null means "not set" (e.g. created before this field existed), in
     * which case the frontend falls back to its legacy name-based guess. */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 20)
    private CommandCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "min_role", nullable = false, length = 30)
    @Builder.Default
    private Role minRole = Role.OPERATOR;
}
