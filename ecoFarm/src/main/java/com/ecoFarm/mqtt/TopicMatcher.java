package com.ecoFarm.mqtt;

import lombok.Getter;

/**
 * Matches and substitutes topic patterns that contain {serial}.
 *
 * Pattern example:   "response/{serial}"
 *   → subscription:  "response/+"
 *   → extract("response/ABC123") → "ABC123"
 *   → materialize("ABC123") → "response/ABC123"
 *
 * Supports nested paths too:  "iot/{tenant}/{serial}/response"
 * (but only {serial} is treated as the subject identifier; other placeholders are matched literally).
 */
@Getter
public class TopicMatcher {

    private static final String SERIAL_PLACEHOLDER = "{serial}";

    private final String pattern;
    private final String[] patternSegments;
    private final int serialIndex;

    public TopicMatcher(String pattern) {
        this.pattern = pattern;
        this.patternSegments = pattern.split("/");
        int idx = -1;
        for (int i = 0; i < patternSegments.length; i++) {
            if (patternSegments[i].equals(SERIAL_PLACEHOLDER)) {
                idx = i;
                break;
            }
        }
        if (idx < 0) {
            throw new IllegalArgumentException("Topic pattern must contain {serial}: " + pattern);
        }
        this.serialIndex = idx;
    }

    /** Convert pattern to an MQTT subscription string by replacing {serial} with +. */
    public String toSubscription() {
        return pattern.replace(SERIAL_PLACEHOLDER, "+");
    }

    /** Returns the serial extracted from the topic, or null if the topic doesn't match. */
    public String extract(String topic) {
        if (topic == null) return null;
        String[] segs = topic.split("/");
        if (segs.length != patternSegments.length) return null;
        for (int i = 0; i < segs.length; i++) {
            if (i == serialIndex) continue;
            if (!patternSegments[i].equals(segs[i])) return null;
        }
        return segs[serialIndex];
    }

    /** Build a concrete topic by substituting the given serial into the pattern. */
    public String materialize(String serial) {
        return pattern.replace(SERIAL_PLACEHOLDER, serial);
    }
}
