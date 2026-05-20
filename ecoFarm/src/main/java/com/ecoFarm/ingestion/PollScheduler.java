package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.entity.PollGroup;
import com.ecoFarm.domain.enums.GatewayStatus;
import com.ecoFarm.mqtt.DriverTopicResolver;
import com.ecoFarm.mqtt.ModbusRequestBuilder;
import com.ecoFarm.mqtt.MqttPublisher;
import com.ecoFarm.mqtt.RequestTracker;
import com.ecoFarm.repository.DeviceRepository;
import com.ecoFarm.repository.PollGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Periodically walks all registered devices and their poll_groups, and sends a
 * Modbus read request via MQTT for each group whose interval has elapsed.
 *
 * Per-poll_group last-fired timestamps are kept in memory — sufficient for MVP.
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class PollScheduler {

    private final DeviceRepository deviceRepository;
    private final PollGroupRepository pollGroupRepository;
    private final ModbusRequestBuilder requestBuilder;
    private final MqttPublisher publisher;
    private final DriverTopicResolver driverTopics;
    private final RequestTracker tracker;

    /** last fire time per (device, poll_group) */
    private final Map<String, Instant> lastFired = new ConcurrentHashMap<>();

    /** Run every 5 seconds — cheap, per-group interval is checked per iteration. */
    @Scheduled(fixedDelayString = "5000", initialDelayString = "15000")
    @Transactional(readOnly = true)
    public void tick() {
        Instant now = Instant.now();
        List<Device> devices = deviceRepository.findAll();

        for (Device device : devices) {
            Gateway gw = device.getGateway();
            if (gw.getStatus() == GatewayStatus.UNREGISTERED) continue;
            if (gw.getSerialNumber() == null) continue;

            List<PollGroup> groups = pollGroupRepository.findByProfileId(device.getProfile().getId());
            for (PollGroup group : groups) {
                String key = device.getId() + ":" + group.getId();
                Instant last = lastFired.get(key);
                if (last != null && last.plusSeconds(group.getIntervalSeconds()).isAfter(now)) continue;

                sendPoll(device, group);
                lastFired.put(key, now);
            }
        }
    }

    private void sendPoll(Device device, PollGroup group) {
        long cookie = tracker.nextCookie();
        tracker.trackPoll(cookie, device.getId(), group.getId());

        // Use FC 3 (Read Holding Registers) as a sensible default for a poll group.
        // Individual data points can still belong to different FCs when looked up on response.
        String payload = requestBuilder.buildSerialRead(
            cookie,
            device.getTimeoutSeconds() != null ? device.getTimeoutSeconds() : 5,
            device.getSlaveId(),
            3,
            group.getStartRegister(),
            group.getCount()
        );

        publisher.publish(driverTopics.requestTopicFor(device.getGateway()), payload);
        log.debug("Polled {} / group {} (cookie={})", device.getName(), group.getName(), cookie);
    }
}
