CREATE TABLE device_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
    name                VARCHAR(255) NOT NULL,
    manufacturer        VARCHAR(255),
    model               VARCHAR(255),
    category            VARCHAR(50)  NOT NULL DEFAULT 'plc',
    default_baud_rate   INTEGER      NOT NULL DEFAULT 9600,
    default_parity      VARCHAR(10)  NOT NULL DEFAULT 'none',
    default_stop_bits   INTEGER      NOT NULL DEFAULT 1,
    description         TEXT,
    created_by          UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_profile_category CHECK (category IN ('energy_meter', 'plc', 'sensor', 'vfd', 'relay'))
);

CREATE INDEX idx_device_profiles_tenant ON device_profiles(tenant_id);

-- ──────────────────────────────────────────

CREATE TABLE poll_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID         NOT NULL REFERENCES device_profiles(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    interval_seconds    INTEGER      NOT NULL DEFAULT 10,
    start_register      INTEGER      NOT NULL,
    count               INTEGER      NOT NULL,

    CONSTRAINT chk_interval CHECK (interval_seconds > 0),
    CONSTRAINT chk_count     CHECK (count > 0)
);

CREATE INDEX idx_poll_groups_profile ON poll_groups(profile_id);
