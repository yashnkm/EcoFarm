package com.ecoFarm.mqtt;

import com.ecoFarm.config.MqttConfig;
import com.ecoFarm.ingestion.IngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * Routes incoming MQTT messages to the correct ingestion handler.
 * Uses the driver's topic patterns to figure out what kind of message it is
 * and which gateway it belongs to.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MqttInboundHandler {

    private final DriverTopicResolver driverTopics;
    private final ModbusResponseParser responseParser;
    private final IngestionService ingestionService;

    @ServiceActivator(inputChannel = MqttConfig.INBOUND_CHANNEL)
    public void handle(Message<?> message) {
        String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        String payload = message.getPayload().toString();

        if (topic == null) {
            log.warn("Received MQTT message with no topic");
            return;
        }

        log.debug("MQTT ← {} : {}", topic, payload);

        try {
            // 1. Does this topic match a driver's response pattern?
            DriverTopicResolver.Match responseMatch = driverTopics.matchResponse(topic);
            if (responseMatch != null) {
                ingestionService.handlePollResponse(responseParser.parse(payload));
                return;
            }

            // 2. Does it match a status pattern?
            DriverTopicResolver.Match statusMatch = driverTopics.matchStatus(topic);
            if (statusMatch != null) {
                ingestionService.handleGatewayStatus(statusMatch.serial(), payload.trim());
                return;
            }

            // 3. Legacy conventions (for gateways that don't declare these patterns on their driver)
            if (topic.startsWith("status/")) {
                ingestionService.handleGatewayStatus(topic.substring("status/".length()), payload.trim());
            } else if (topic.startsWith("heartbeat/")) {
                ingestionService.handleGatewayHeartbeat(topic.substring("heartbeat/".length()));
            } else if (topic.startsWith("errors/")) {
                log.warn("Gateway error on {}: {}", topic, payload);
            } else {
                log.debug("Unhandled topic (no driver match): {}", topic);
            }
        } catch (Exception e) {
            log.error("Failed to process MQTT message on topic {}: {}", topic, e.getMessage(), e);
        }
    }
}
