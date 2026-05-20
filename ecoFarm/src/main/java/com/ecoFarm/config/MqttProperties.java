package com.ecoFarm.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.mqtt")
@Getter
@Setter
public class MqttProperties {

    private String brokerUrl;
    private String clientId;
    private String username;
    private String password;
    private int qos = 1;
}
