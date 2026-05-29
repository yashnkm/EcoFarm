package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.GatewayStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "gateways")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gateway {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

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
    @JoinColumn(name = "driver_id", nullable = false)
    private GatewayDriver driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mqtt_broker_id")
    private MqttBroker mqttBroker;

    @Column(name = "serial_number", nullable = false, unique = true, length = 100)
    private String serialNumber;

    @Column(name = "mqtt_client_id", length = 100)
    private String mqttClientId;

    private String name;

    // RS485 bus settings — shared by every device on this gateway's serial port
    @Column(name = "baud_rate", nullable = false, columnDefinition = "INTEGER DEFAULT 9600")
    @Builder.Default
    private Integer baudRate = 9600;

    @Column(name = "parity", nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'none'")
    @Builder.Default
    private String parity = "none";

    @Column(name = "stop_bits", nullable = false, columnDefinition = "INTEGER DEFAULT 1")
    @Builder.Default
    private Integer stopBits = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private GatewayStatus status = GatewayStatus.UNREGISTERED;

    @Column(name = "last_seen")
    private Instant lastSeen;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
