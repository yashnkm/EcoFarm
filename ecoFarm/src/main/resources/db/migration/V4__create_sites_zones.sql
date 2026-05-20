CREATE TABLE sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    lat         NUMERIC(10, 7),
    lng         NUMERIC(10, 7),
    timezone    VARCHAR(100) NOT NULL DEFAULT 'UTC',
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_site_status CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_sites_tenant ON sites(tenant_id);

-- ──────────────────────────────────────────

CREATE TABLE zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID         NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_zones_site ON zones(site_id);
