package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.ControlCommand;
import com.ecoFarm.domain.entity.Device;
import com.ecoFarm.domain.entity.MqttBroker;
import com.ecoFarm.domain.enums.CommandStatus;
import com.ecoFarm.mqtt.DriverTopicResolver;
import com.ecoFarm.mqtt.ModbusRequestBuilder;
import com.ecoFarm.mqtt.MqttPublisher;
import com.ecoFarm.mqtt.RequestTracker;
import com.ecoFarm.repository.ControlCommandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Picks up PENDING control commands and dispatches them over MQTT.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommandDispatcher {

    private final ControlCommandRepository controlCommandRepository;
    private final ModbusRequestBuilder requestBuilder;
    private final MqttPublisher publisher;
    private final DriverTopicResolver driverTopics;
    private final RequestTracker tracker;

    @Scheduled(fixedDelayString = "2000", initialDelayString = "10000")
    @Transactional
    public void dispatch() {
        List<ControlCommand> pending = controlCommandRepository.findByStatus(CommandStatus.PENDING);
        for (ControlCommand cmd : pending) {
            try {
                send(cmd);
            } catch (Exception e) {
                log.error("Failed to dispatch command {}: {}", cmd.getId(), e.getMessage(), e);
                cmd.setStatus(CommandStatus.FAILED);
                cmd.setResult(e.getMessage());
            }
        }
    }

    private void send(ControlCommand cmd) {
        Device device = cmd.getDevice();
        String serial = device.getGateway().getSerialNumber();
        if (serial == null) {
            cmd.setStatus(CommandStatus.FAILED);
            cmd.setResult("Gateway has no serial number");
            return;
        }

        MqttBroker broker = device.getGateway().getTenant().getMqttBroker();
        if (broker == null) {
            cmd.setStatus(CommandStatus.FAILED);
            cmd.setResult("Tenant has no MQTT broker assigned");
            return;
        }

        long cookie = tracker.nextCookie();
        tracker.trackCommand(cookie, device.getId(), cmd.getId());

        String payload = requestBuilder.buildSerialWrite(
            cookie,
            device.getTimeoutSeconds() != null ? device.getTimeoutSeconds() : 5,
            device.getSlaveId(),
            cmd.getFunctionCode(),
            cmd.getRegisterNumber(),
            cmd.getValue()
        );

        publisher.publish(broker, driverTopics.requestTopicFor(device.getGateway()), payload);

        cmd.setStatus(CommandStatus.SENT);
        cmd.setSentAt(Instant.now());
        log.info("Dispatched command {} → device {} (cookie={})", cmd.getId(), device.getId(), cookie);
    }
}
