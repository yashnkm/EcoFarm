package com.ecoFarm.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.resend")
@Getter
@Setter
public class ResendProperties {

    /** Blank in local dev by design — EmailService no-ops (logs instead of
     * sending) rather than failing, so user creation still works without a
     * real key configured. */
    private String apiKey;

    /** e.g. "EcoFarm <welcome@mail.chandramaautomation.com>" */
    private String from;
}
