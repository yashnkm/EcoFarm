CREATE TABLE control_commands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    issued_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    register_number INTEGER     NOT NULL,
    function_code   INTEGER     NOT NULL,
    value           INTEGER     NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    result          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_command_status CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed'))
);

CREATE INDEX idx_commands_device ON control_commands(device_id);
CREATE INDEX idx_commands_status ON control_commands(status);
