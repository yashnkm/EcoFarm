CREATE TABLE data_points (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID         NOT NULL REFERENCES device_profiles(id) ON DELETE CASCADE,
    poll_group_id   UUID         REFERENCES poll_groups(id) ON DELETE SET NULL,
    key             VARCHAR(100) NOT NULL,
    label           VARCHAR(255) NOT NULL,
    register_number INTEGER      NOT NULL,
    function_code   INTEGER      NOT NULL,
    data_type       VARCHAR(20)  NOT NULL DEFAULT 'UINT16',
    word_count      INTEGER      NOT NULL DEFAULT 1,
    byte_order      VARCHAR(20)  NOT NULL DEFAULT 'big_endian',
    scale_factor    NUMERIC(12,6) NOT NULL DEFAULT 1.0,
    offset          NUMERIC(12,6) NOT NULL DEFAULT 0.0,
    unit            VARCHAR(50),
    min_value       NUMERIC(15,4),
    max_value       NUMERIC(15,4),
    is_writable     BOOLEAN      NOT NULL DEFAULT false,
    is_displayed    BOOLEAN      NOT NULL DEFAULT true,
    display_widget  VARCHAR(50)  NOT NULL DEFAULT 'number',

    CONSTRAINT chk_data_type     CHECK (data_type     IN ('UINT16','INT16','UINT32','INT32','FLOAT32','ASCII')),
    CONSTRAINT chk_byte_order    CHECK (byte_order     IN ('big_endian','little_endian')),
    CONSTRAINT chk_display_widget CHECK (display_widget IN ('gauge','number','boolean_toggle','status_badge')),
    CONSTRAINT uq_data_point_key  UNIQUE (profile_id, key)
);

CREATE INDEX idx_data_points_profile    ON data_points(profile_id);
CREATE INDEX idx_data_points_poll_group ON data_points(poll_group_id);

-- ──────────────────────────────────────────

CREATE TABLE command_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id              UUID         NOT NULL REFERENCES device_profiles(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    register_number         INTEGER      NOT NULL,
    function_code           INTEGER      NOT NULL,
    value                   INTEGER      NOT NULL,
    confirmation_required   BOOLEAN      NOT NULL DEFAULT true,
    min_role                VARCHAR(30)  NOT NULL DEFAULT 'operator',

    CONSTRAINT chk_cmd_min_role CHECK (min_role IN ('operator', 'tenant_admin', 'super_admin'))
);

CREATE INDEX idx_command_templates_profile ON command_templates(profile_id);
