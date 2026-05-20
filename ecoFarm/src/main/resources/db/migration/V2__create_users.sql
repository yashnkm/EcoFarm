CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30)  NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'invited',
    invited_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
    invited_at      TIMESTAMPTZ,
    activated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_user_role   CHECK (role   IN ('super_admin', 'tenant_admin', 'operator', 'viewer')),
    CONSTRAINT chk_user_status CHECK (status IN ('active', 'invited', 'suspended'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email  ON users(email);
