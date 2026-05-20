package com.ecoFarm.mqtt;

import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.entity.GatewayDriver;
import com.ecoFarm.repository.GatewayDriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Looks up topic patterns on GatewayDrivers and turns them into
 * concrete MQTT topics / subscriptions / extractions.
 *
 * This is what makes drivers a real extension point — new gateway models
 * can use different topic layouts without changing code.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DriverTopicResolver {

    private final GatewayDriverRepository driverRepository;

    /** Topic to publish a Modbus request to this specific gateway. */
    public String requestTopicFor(Gateway gateway) {
        String pattern = gateway.getDriver().getTopicRequest();
        return new TopicMatcher(pattern).materialize(gateway.getSerialNumber());
    }

    /**
     * All distinct response subscription patterns across every registered driver.
     * Used at MQTT connect time to build the subscribe list.
     */
    public List<String> allResponseSubscriptions() {
        return driverRepository.findAll().stream()
            .map(GatewayDriver::getTopicResponse)
            .distinct()
            .map(p -> new TopicMatcher(p).toSubscription())
            .toList();
    }

    /** All distinct status subscriptions (drivers that have a topicStatus set). */
    public List<String> allStatusSubscriptions() {
        return driverRepository.findAll().stream()
            .map(GatewayDriver::getTopicStatus)
            .filter(p -> p != null && !p.isBlank())
            .distinct()
            .map(p -> new TopicMatcher(p).toSubscription())
            .toList();
    }

    /**
     * Try each driver's response pattern in turn. Returns the first match or null.
     * Lets the inbound handler figure out which driver (and therefore which
     * gateway) a topic belongs to.
     */
    public Match matchResponse(String topic) {
        for (GatewayDriver d : driverRepository.findAll()) {
            TopicMatcher m = new TopicMatcher(d.getTopicResponse());
            String serial = m.extract(topic);
            if (serial != null) {
                return new Match(d, serial, "response");
            }
        }
        return null;
    }

    public Match matchStatus(String topic) {
        for (GatewayDriver d : driverRepository.findAll()) {
            String p = d.getTopicStatus();
            if (p == null || p.isBlank()) continue;
            String serial = new TopicMatcher(p).extract(topic);
            if (serial != null) {
                return new Match(d, serial, "status");
            }
        }
        return null;
    }

    /** All subscription patterns combined — response + status — used for startup. */
    public Set<String> allSubscriptions() {
        Set<String> out = new LinkedHashSet<>();
        out.addAll(allResponseSubscriptions());
        out.addAll(allStatusSubscriptions());
        return out;
    }

    public record Match(GatewayDriver driver, String serial, String type) {}
}
