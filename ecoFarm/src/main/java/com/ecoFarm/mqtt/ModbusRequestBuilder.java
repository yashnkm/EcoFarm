package com.ecoFarm.mqtt;

import org.springframework.stereotype.Component;

/**
 * Builds TRB145 MQTT Modbus Gateway request payloads.
 *
 * Serial target (RS485):
 *   1 <cookie> <serial_device_id> <timeout> <server_id> <fc> <first_reg> <count> <broadcast>
 *
 * TCP target:
 *   0 <cookie> <ip_type> <ip> <port> <timeout> <server_id> <fc> <first_reg> <count> <broadcast>
 */
@Component
public class ModbusRequestBuilder {

    private static final int DEFAULT_SERIAL_DEVICE_ID = 1;

    /** Serial (RS485) read request. */
    public String buildSerialRead(long cookie, int timeoutSeconds, int slaveId, int functionCode, int firstReg, int count) {
        return String.format("1 %d %d %d %d %d %d %d 0",
            cookie,
            DEFAULT_SERIAL_DEVICE_ID,
            timeoutSeconds,
            slaveId,
            functionCode,
            firstReg,
            count);
    }

    /** Serial (RS485) write request — count field holds the value to write. */
    public String buildSerialWrite(long cookie, int timeoutSeconds, int slaveId, int functionCode, int register, int value) {
        return String.format("1 %d %d %d %d %d %d %d 0",
            cookie,
            DEFAULT_SERIAL_DEVICE_ID,
            timeoutSeconds,
            slaveId,
            functionCode,
            register,
            value);
    }
}
