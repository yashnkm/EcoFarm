package com.ecoFarm.mqtt;

import lombok.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory map of cookie → context for outstanding Modbus requests.
 * When a response arrives, we look up the cookie to know which device/poll_group/command
 * it belongs to. Cookies are 64-bit unsigned values per the TRB145 spec.
 *
 * NOTE: for multi-instance deployments this needs a shared store (Redis) — fine for MVP.
 */
@Component
public class RequestTracker {

    private final AtomicLong sequence = new AtomicLong(System.currentTimeMillis());
    private final Map<Long, PendingRequest> pending = new ConcurrentHashMap<>();

    public long nextCookie() {
        return sequence.incrementAndGet();
    }

    public void trackPoll(long cookie, UUID deviceId, UUID pollGroupId) {
        pending.put(cookie, new PendingRequest(RequestType.POLL, deviceId, pollGroupId, null));
    }

    public void trackCommand(long cookie, UUID deviceId, UUID commandId) {
        pending.put(cookie, new PendingRequest(RequestType.COMMAND, deviceId, null, commandId));
    }

    public PendingRequest complete(long cookie) {
        return pending.remove(cookie);
    }

    public enum RequestType { POLL, COMMAND }

    @Value
    public static class PendingRequest {
        RequestType type;
        UUID deviceId;
        UUID pollGroupId;
        UUID commandId;
    }
}
