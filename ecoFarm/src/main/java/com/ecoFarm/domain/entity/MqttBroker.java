package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.BrokerStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * An MQTT broker the platform can connect to. Managed by super admins.
 * Tenants reference a broker to route their gateway traffic.
 */
@Entity
@Table(name = "mqtt_brokers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MqttBroker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String host;

    @Column(nullable = false)
    @Builder.Default
    private Integer port = 1883;

    @Column(name = "use_tls", nullable = false)
    @Builder.Default
    private boolean useTls = false;

    private String username;

    /** Stored as-is for MVP. TODO: encrypt at rest (e.g. Jasypt). */
    private String password;

    @Column(name = "keepalive_seconds", nullable = false)
    @Builder.Default
    private Integer keepaliveSeconds = 60;

    @Column(name = "default_qos", nullable = false)
    @Builder.Default
    private Integer defaultQos = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BrokerStatus status = BrokerStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public String getBrokerUrl() {
        return (useTls ? "ssl://" : "tcp://") + host + ":" + port;
    }
}
