CREATE TABLE alert_rules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id               UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    data_point_key          VARCHAR(100) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    condition               VARCHAR(10)  NOT NULL,
    threshold               NUMERIC(15,4) NOT NULL,
    severity                VARCHAR(20)  NOT NULL DEFAULT 'warning',
    enabled                 BOOLEAN      NOT NULL DEFAULT true,
    notification_channels   JSONB        NOT NULL DEFAULT '[]',
    cooldown_minutes        INTEGER      NOT NULL DEFAULT 15,
    created_by              UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_alert_condition CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte', 'neq')),
    CONSTRAINT chk_alert_severity  CHECK (severity  IN ('info', 'warning', 'critical', 'emergency'))
);

CREATE INDEX idx_alert_rules_device ON alert_rules(device_id);
CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id);

-- ──────────────────────────────────────────

CREATE TABLE alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_rule_id       UUID         NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    device_id           UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    data_point_key      VARCHAR(100) NOT NULL,
    triggered_value     NUMERIC(15,4),
    severity            VARCHAR(20)  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
    triggered_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    acknowledged_at     TIMESTAMPTZ,
    acknowledged_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID         REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

CREATE INDEX idx_alerts_tenant    ON alerts(tenant_id);
CREATE INDEX idx_alerts_device    ON alerts(device_id);
CREATE INDEX idx_alerts_status    ON alerts(status);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);
