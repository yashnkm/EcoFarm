CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL DEFAULT 'info',
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_notification_type CHECK (type IN ('alert', 'system', 'info'))
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ──────────────────────────────────────────

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     UUID,
    payload         JSONB,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant  ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_time    ON audit_logs(created_at DESC);

-- ──────────────────────────────────────────

CREATE TABLE communication_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    gateway_id      UUID        REFERENCES gateways(id) ON DELETE SET NULL,
    device_id       UUID        REFERENCES devices(id) ON DELETE SET NULL,
    direction       VARCHAR(10) NOT NULL,
    modbus_fc       INTEGER,
    register        INTEGER,
    value           TEXT,
    status          VARCHAR(10) NOT NULL DEFAULT 'ok',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_comm_direction CHECK (direction IN ('request', 'response')),
    CONSTRAINT chk_comm_status    CHECK (status    IN ('ok', 'error'))
);

CREATE INDEX idx_comm_logs_gateway ON communication_logs(gateway_id);
CREATE INDEX idx_comm_logs_device  ON communication_logs(device_id);
CREATE INDEX idx_comm_logs_time    ON communication_logs(created_at DESC);

-- ──────────────────────────────────────────

CREATE TABLE system_event_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    event_type  VARCHAR(100) NOT NULL,
    site_id     UUID        REFERENCES sites(id) ON DELETE SET NULL,
    gateway_id  UUID        REFERENCES gateways(id) ON DELETE SET NULL,
    device_id   UUID        REFERENCES devices(id) ON DELETE SET NULL,
    severity    VARCHAR(20) NOT NULL DEFAULT 'info',
    message     TEXT        NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_event_severity CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE INDEX idx_sys_event_logs_tenant  ON system_event_logs(tenant_id);
CREATE INDEX idx_sys_event_logs_gateway ON system_event_logs(gateway_id);
CREATE INDEX idx_sys_event_logs_time    ON system_event_logs(created_at DESC);
