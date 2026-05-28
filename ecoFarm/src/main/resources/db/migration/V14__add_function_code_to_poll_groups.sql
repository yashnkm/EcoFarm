-- Move function_code from data_points to poll_groups.
-- Existing poll groups default to FC 3 (Read Holding Registers).
ALTER TABLE poll_groups
    ADD COLUMN function_code INTEGER NOT NULL DEFAULT 3;

ALTER TABLE poll_groups
    ALTER COLUMN function_code DROP DEFAULT;

COMMENT ON COLUMN poll_groups.function_code IS
    'Modbus function code used for every register polled in this group (e.g. 3 = Read Holding Registers).';
