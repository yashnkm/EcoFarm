package com.ecoFarm.mqtt;

import lombok.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses TRB145 MQTT Modbus Gateway response messages.
 *
 * Success (read):  <cookie> OK <val1> <val2> ...
 * Success (write): <cookie> OK
 * Error:           <cookie> ERROR: <description>
 */
@Component
public class ModbusResponseParser {

    @Value
    public static class ParsedResponse {
        long cookie;
        boolean success;
        List<Integer> values;    // empty for writes or errors
        String errorMessage;     // null if success
    }

    public ParsedResponse parse(String payload) {
        if (payload == null || payload.isBlank()) {
            return new ParsedResponse(0, false, List.of(), "Empty payload");
        }

        String[] parts = payload.trim().split("\\s+");
        if (parts.length < 2) {
            return new ParsedResponse(0, false, List.of(), "Malformed response: " + payload);
        }

        long cookie;
        try {
            cookie = Long.parseUnsignedLong(parts[0]);
        } catch (NumberFormatException e) {
            return new ParsedResponse(0, false, List.of(), "Invalid cookie: " + parts[0]);
        }

        String status = parts[1];

        if (status.equalsIgnoreCase("OK")) {
            List<Integer> values = new ArrayList<>();
            for (int i = 2; i < parts.length; i++) {
                try {
                    values.add(Integer.parseUnsignedInt(parts[i]));
                } catch (NumberFormatException e) {
                    return new ParsedResponse(cookie, false, List.of(),
                        "Invalid register value: " + parts[i]);
                }
            }
            return new ParsedResponse(cookie, true, values, null);
        }

        // ERROR: <description>  — description may contain spaces
        int errIdx = payload.indexOf("ERROR");
        String description = errIdx >= 0 ? payload.substring(errIdx) : "Unknown error";
        return new ParsedResponse(cookie, false, List.of(), description);
    }
}
