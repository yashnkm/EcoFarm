package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.GatewayProtocol;
import com.ecoFarm.domain.enums.GatewayTransport;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "gateway_drivers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayDriver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private GatewayTransport transport;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private GatewayProtocol protocol;

    @Column(name = "request_format", columnDefinition = "TEXT")
    private String requestFormat;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_parser", columnDefinition = "jsonb")
    private String responseParser;

    @Column(name = "supports_broadcast", nullable = false)
    @Builder.Default
    private boolean supportsBroadcast = false;

    // ── Topic + wire-format patterns (what the gateway firmware uses) ──
    @Column(name = "message_type", nullable = false, length = 20,
            columnDefinition = "VARCHAR(20) DEFAULT 'ASCII'")
    @Builder.Default
    private String messageType = "ASCII";

    /** Pattern where backend publishes requests. {serial} substituted at send time. */
    @Column(name = "topic_request", nullable = false, length = 100,
            columnDefinition = "VARCHAR(100) DEFAULT 'request/{serial}'")
    @Builder.Default
    private String topicRequest = "request/{serial}";

    /** Pattern gateway publishes responses to. Subscribed by backend. */
    @Column(name = "topic_response", nullable = false, length = 100,
            columnDefinition = "VARCHAR(100) DEFAULT 'response/{serial}'")
    @Builder.Default
    private String topicResponse = "response/{serial}";

    /** Optional pattern for online/offline status (LWT). */
    @Column(name = "topic_status", length = 100)
    private String topicStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
