-- Partitioned by month on `time` column
-- pg_partman will manage partition creation automatically
-- For MVP, we create the table + first two partitions manually

CREATE TABLE readings (
    time        TIMESTAMPTZ      NOT NULL,
    tenant_id   UUID             NOT NULL,
    site_id     UUID,
    gateway_id  UUID             NOT NULL,
    device_id   UUID             NOT NULL,
    data_point  VARCHAR(100)     NOT NULL,
    value       DOUBLE PRECISION,
    raw_value   INTEGER,
    quality     VARCHAR(20)      NOT NULL DEFAULT 'good',
    unit        VARCHAR(50),

    CONSTRAINT chk_reading_quality CHECK (quality IN ('good', 'suspect', 'error'))
) PARTITION BY RANGE (time);

-- Initial partitions — add more via pg_partman or a scheduled job
CREATE TABLE readings_2025_04 PARTITION OF readings
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE readings_2025_05 PARTITION OF readings
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE readings_2025_06 PARTITION OF readings
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE readings_2026_01 PARTITION OF readings
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE readings_2026_02 PARTITION OF readings
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE readings_2026_03 PARTITION OF readings
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE readings_2026_04 PARTITION OF readings
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE readings_2026_05 PARTITION OF readings
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE readings_2026_06 PARTITION OF readings
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE readings_2026_07 PARTITION OF readings
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE readings_2026_08 PARTITION OF readings
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE readings_2026_09 PARTITION OF readings
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE readings_2026_10 PARTITION OF readings
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE readings_2026_11 PARTITION OF readings
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE readings_2026_12 PARTITION OF readings
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Indexes — created on the parent, inherited by all partitions
CREATE INDEX idx_readings_device_time  ON readings (device_id, time DESC);
CREATE INDEX idx_readings_site_time    ON readings (site_id,   time DESC);
CREATE INDEX idx_readings_tenant_time  ON readings (tenant_id, time DESC);
CREATE INDEX idx_readings_brin         ON readings USING BRIN (time);

-- Unique constraint for upsert deduplication (MQTT QoS 1 retries)
CREATE UNIQUE INDEX idx_readings_upsert ON readings (device_id, data_point, time);
