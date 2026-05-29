package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.Gateway;
import com.ecoFarm.domain.entity.MqttBroker;
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
        log.info("Poll tick: scanning {} device(s)", devices.size());

        int pollsSent = 0;
        int skipped = 0;
        for (Device device : devices) {
            Gateway gw = device.getGateway();

            if (gw.getStatus() == GatewayStatus.UNREGISTERED) {
                log.info("Poll skip: device '{}' — gateway '{}' is UNREGISTERED "
                    + "(claim it / assign a site to activate polling)",
                    device.getName(), gw.getSerialNumber());
                skipped++;
                continue;
            }
            if (gw.getSerialNumber() == null) {
                log.info("Poll skip: device '{}' — gateway has no serial number", device.getName());
                skipped++;
                continue;
            }

            MqttBroker broker = gw.getMqttBroker();
            if (broker == null) {
                log.info("Poll skip: device '{}' — gateway '{}' has no MQTT broker assigned",
                    device.getName(), gw.getSerialNumber());
                skipped++;
                continue;
            }

            List<PollGroup> groups = pollGroupRepository.findByProfileId(device.getProfile().getId());
            if (groups.isEmpty()) {
                log.info("Poll skip: device '{}' — profile '{}' has no poll groups defined",
                    device.getName(), device.getProfile().getName());
                skipped++;
                continue;
            }

            for (PollGroup group : groups) {
                String key = device.getId() + ":" + group.getId();
                Instant last = lastFired.get(key);
                if (last != null && last.plusSeconds(group.getIntervalSeconds()).isAfter(now)) {
                    continue;
                }

                sendPoll(device, group, broker);
                lastFired.put(key, now);
                pollsSent++;
            }
        }
        log.info("Poll tick done: {} poll(s) sent, {} device(s) skipped", pollsSent, skipped);
    }

    private void sendPoll(Device device, PollGroup group, MqttBroker broker) {
        long cookie = tracker.nextCookie();
        tracker.trackPoll(cookie, device.getId(), group.getId());

        String payload = requestBuilder.buildSerialRead(
            cookie,
            device.getTimeoutSeconds() != null ? device.getTimeoutSeconds() : 5,
            device.getSlaveId(),
            group.getFunctionCode(),
            group.getStartRegister(),
            group.getCount()
        );

        String topic = driverTopics.requestTopicFor(device.getGateway());
        publisher.publish(broker, topic, payload);
        log.info("Poll sent: device '{}' / group '{}' → broker '{}' ({}) topic '{}' (cookie={})",
            device.getName(), group.getName(), broker.getName(), broker.getBrokerUrl(), topic, cookie);
    }
}
