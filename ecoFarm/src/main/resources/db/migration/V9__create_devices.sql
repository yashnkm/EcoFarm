CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id      UUID         NOT NULL REFERENCES gateways(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id         UUID         REFERENCES sites(id) ON DELETE SET NULL,
    zone_id         UUID         REFERENCES zones(id) ON DELETE SET NULL,
    profile_id      UUID         NOT NULL REFERENCES device_profiles(id),
    name            VARCHAR(255) NOT NULL,
    slave_id        INTEGER      NOT NULL,
    protocol        VARCHAR(20)  NOT NULL DEFAULT 'rtu',
    ip_address      VARCHAR(50),
    port            INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'offline',
    last_reading_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_device_protocol CHECK (protocol IN ('rtu', 'tcp')),
    CONSTRAINT chk_device_status   CHECK (status   IN ('online', 'offline', 'error')),
    CONSTRAINT uq_device_slave      UNIQUE (gateway_id, slave_id)
);

CREATE INDEX idx_devices_tenant  ON devices(tenant_id);
CREATE INDEX idx_devices_site    ON devices(site_id);
CREATE INDEX idx_devices_gateway ON devices(gateway_id);
CREATE INDEX idx_devices_status  ON devices(status);
