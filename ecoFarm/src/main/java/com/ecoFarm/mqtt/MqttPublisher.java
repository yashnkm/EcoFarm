package com.ecoFarm.mqtt;

import com.ecoFarm.config.MqttConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

/** Thin wrapper to publish messages to the MQTT outbound channel. */
@Slf4j
@Component
public class MqttPublisher {

    private final MessageChannel outboundChannel;

    public MqttPublisher(@Qualifier(MqttConfig.OUTBOUND_CHANNEL) MessageChannel outboundChannel) {
        this.outboundChannel = outboundChannel;
    }

    public void publish(String topic, String payload) {
        log.debug("MQTT → {} : {}", topic, payload);
        outboundChannel.send(MessageBuilder
            .withPayload(payload)
            .setHeader(MqttHeaders.TOPIC, topic)
            .build());
    }
}
