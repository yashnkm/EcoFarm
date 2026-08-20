package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.DeviceProtocol;
import com.ecoFarm.domain.enums.DeviceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "devices",
    uniqueConstraints = @UniqueConstraint(name = "uq_device_slave", columnNames = {"gateway_id", "slave_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "gateway_id", nullable = false)
    private Gateway gateway;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private DeviceProfile profile;

    @Column(nullable = false)
    private String name;

    @Column(name = "slave_id", nullable = false)
    private Integer slaveId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeviceProtocol protocol = DeviceProtocol.RTU;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    private Integer port;

    @Column(name = "timeout_seconds", nullable = false, columnDefinition = "INTEGER DEFAULT 5")
    @Builder.Default
    private Integer timeoutSeconds = 5;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Column(name = "last_reading_at")
    private Instant lastReadingAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recorded_data_points", columnDefinition = "jsonb")
    @Builder.Default
    private Set<String> recordedDataPoints = new HashSet<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_point_groups", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> dataPointGroups = new HashMap<>();

    /** Same idea as dataPointGroups, but keyed by command template id instead
     * of data point key — which zone/section a command belongs to. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "command_groups", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> commandGroups = new HashMap<>();

    /** Where this device sits in tenant-wide device lists — null (the
     * default, e.g. before anyone has ever dragged to reorder) means "no
     * explicit position yet", and the frontend falls back to sorting by
     * name. */
    @Column(name = "sort_order")
    private Integer sortOrder;

    /** Display order for this device's own section cards (Section-1,
     * Section-2, ... — the free-text zone names in dataPointGroups), keyed
     * by zone name -> position. A zone with no entry here (e.g. one just
     * created) sorts after all explicitly-ordered ones, by name. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "zone_order", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Integer> zoneOrder = new HashMap<>();
}
