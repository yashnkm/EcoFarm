package com.ecoFarm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.integration.config.EnableIntegration;
import org.springframework.messaging.MessageChannel;

/**
 * Shared inbound channel for MQTT messages.
 *
 * Actual broker connections are managed at runtime, one per database
 * {@code MqttBroker} row, by {@code MqttConnectionManager}. Every connection
 * funnels received messages into this single channel, where
 * {@code MqttInboundHandler} consumes them via {@code @ServiceActivator}.
 */
@Configuration
@EnableIntegration
public class MqttConfig {

    public static final String INBOUND_CHANNEL = "mqttInboundChannel";

    @Bean(name = INBOUND_CHANNEL)
    public MessageChannel mqttInboundChannel() {
        return new PublishSubscribeChannel();
    }
}
