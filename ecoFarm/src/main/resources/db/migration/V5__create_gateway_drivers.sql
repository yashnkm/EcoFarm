CREATE TABLE gateway_drivers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    transport           VARCHAR(50)  NOT NULL,
    protocol            VARCHAR(50)  NOT NULL,
    request_format      TEXT,
    response_parser     JSONB,
    supports_broadcast  BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_driver_transport CHECK (transport IN ('mqtt', 'modbus_tcp', 'opcua')),
    CONSTRAINT chk_driver_protocol  CHECK (protocol  IN ('modbus_rtu', 'modbus_tcp'))
);

-- Seed the default TRB145 driver
INSERT INTO gateway_drivers (id, name, transport, protocol, supports_broadcast)
VALUES (
    gen_random_uuid(),
    'TRB145 MQTT Gateway',
    'mqtt',
    'modbus_rtu',
    true
);
