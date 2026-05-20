package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.ReadingQuality;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Reading entity. In production this table should be PARTITIONED BY RANGE(time),
 * managed manually or via pg_partman. Hibernate creates an unpartitioned table
 * for MVP which is fine at this scale.
 *
 * Composite primary key (device_id, data_point, time) doubles as the upsert key
 * for deduplicating MQTT QoS 1 retries.
 */
@Entity
@Table(
    name = "readings",
    indexes = {
        @Index(name = "idx_readings_device_time", columnList = "device_id, time DESC"),
        @Index(name = "idx_readings_site_time",   columnList = "site_id, time DESC"),
        @Index(name = "idx_readings_tenant_time", columnList = "tenant_id, time DESC")
    }
)
@IdClass(Reading.ReadingId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reading {

    @Id
    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Id
    @Column(name = "data_point", nullable = false, length = 100)
    private String dataPoint;

    @Id
    @Column(name = "time", nullable = false)
    private Instant time;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "site_id")
    private UUID siteId;

    @Column(name = "gateway_id", nullable = false)
    private UUID gatewayId;

    @Column
    private Double value;

    @Column(name = "raw_value")
    private Integer rawValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReadingQuality quality = ReadingQuality.GOOD;

    @Column(length = 50)
    private String unit;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReadingId implements Serializable {
        private UUID deviceId;
        private String dataPoint;
        private Instant time;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ReadingId that)) return false;
            return Objects.equals(deviceId, that.deviceId)
                && Objects.equals(dataPoint, that.dataPoint)
                && Objects.equals(time, that.time);
        }

        @Override
        public int hashCode() {
            return Objects.hash(deviceId, dataPoint, time);
        }
    }
}
