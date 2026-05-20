CREATE TABLE gateways (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id         UUID         REFERENCES sites(id) ON DELETE SET NULL,
    zone_id         UUID         REFERENCES zones(id) ON DELETE SET NULL,
    driver_id       UUID         NOT NULL REFERENCES gateway_drivers(id),
    serial_number   VARCHAR(100) NOT NULL UNIQUE,
    mqtt_client_id  VARCHAR(100),
    name            VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'unregistered',
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_gateway_status CHECK (status IN ('online', 'offline', 'degraded', 'unregistered'))
);

CREATE INDEX idx_gateways_tenant  ON gateways(tenant_id);
CREATE INDEX idx_gateways_site    ON gateways(site_id);
CREATE INDEX idx_gateways_status  ON gateways(status);
