package com.ecoFarm.config;

import com.ecoFarm.domain.entity.*;
import com.ecoFarm.domain.enums.*;
import com.ecoFarm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * On first startup, creates a default platform tenant + super admin + default gateway
 * driver + a sample global device profile so the API is immediately usable.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String DEFAULT_ADMIN_EMAIL    = "admin@ecofarm.local";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";
    private static final String DEFAULT_TENANT_SLUG    = "platform";
    private static final String DEFAULT_DRIVER_NAME    = "TRB145 MQTT Gateway";
    private static final String DEFAULT_BROKER_NAME    = "Platform Broker";
    private static final String DEMO_PROFILE_NAME      = "Generic Energy Meter";
    private static final String TEST_PROFILE_NAME      = "Single Register Test (reg 3002)";

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final GatewayDriverRepository gatewayDriverRepository;
    private final MqttBrokerRepository mqttBrokerRepository;
    private final DeviceProfileRepository deviceProfileRepository;
    private final PollGroupRepository pollGroupRepository;
    private final DataPointRepository dataPointRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final PasswordEncoder passwordEncoder;
    private final MqttProperties mqttProperties;

    @Override
    @Transactional
    public void run(String... args) {
        MqttBroker broker = seedDefaultBroker();
        seedPlatformTenantAndAdmin(broker);
        seedDefaultGatewayDriver();
        seedDemoDeviceProfile();
        seedSingleRegisterTestProfile();
    }

    /**
     * Seeds an MqttBroker record from application.properties values on first boot.
     * After that, super admin edits through the UI; this method is a no-op.
     */
    private MqttBroker seedDefaultBroker() {
        return mqttBrokerRepository.findByName(DEFAULT_BROKER_NAME).orElseGet(() -> {
            String url = mqttProperties.getBrokerUrl() != null
                ? mqttProperties.getBrokerUrl() : "tcp://localhost:1883";
            String host = url.replaceAll("^\\w+://", "").split(":")[0];
            int port;
            try {
                port = Integer.parseInt(url.replaceAll("^\\w+://", "").split(":")[1]);
            } catch (Exception e) {
                port = 1883;
            }
            boolean tls = url.startsWith("ssl://");

            MqttBroker b = mqttBrokerRepository.save(MqttBroker.builder()
                .name(DEFAULT_BROKER_NAME)
                .host(host)
                .port(port)
                .useTls(tls)
                .username(mqttProperties.getUsername())
                .password(mqttProperties.getPassword())
                .keepaliveSeconds(60)
                .defaultQos(mqttProperties.getQos())
                .build());
            log.info("Seeded default MQTT broker '{}' at {}:{}", b.getName(), host, port);
            return b;
        });
    }

    private void seedPlatformTenantAndAdmin(MqttBroker broker) {
        Tenant tenant = tenantRepository.findBySlug(DEFAULT_TENANT_SLUG).orElseGet(() ->
            tenantRepository.save(Tenant.builder()
                .name("Platform")
                .slug(DEFAULT_TENANT_SLUG)
                .mqttBroker(broker)
                .build())
        );

        // Back-fill broker reference for tenants created before broker management existed
        if (tenant.getMqttBroker() == null) {
            tenant.setMqttBroker(broker);
        }

        if (userRepository.existsByEmail(DEFAULT_ADMIN_EMAIL)) return;

        userRepository.save(User.builder()
            .tenant(tenant)
            .email(DEFAULT_ADMIN_EMAIL)
            .passwordHash(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD))
            .role(Role.SUPER_ADMIN)
            .firstName("Platform")
            .lastName("Admin")
            .status(UserStatus.ACTIVE)
            .activatedAt(Instant.now())
            .build());

        log.warn("─────────────────────────────────────────────────────");
        log.warn(" Default super admin created — change in production!");
        log.warn("   email:    {}", DEFAULT_ADMIN_EMAIL);
        log.warn("   password: {}", DEFAULT_ADMIN_PASSWORD);
        log.warn("─────────────────────────────────────────────────────");
    }

    private void seedDefaultGatewayDriver() {
        if (gatewayDriverRepository.findByName(DEFAULT_DRIVER_NAME).isPresent()) return;

        gatewayDriverRepository.save(GatewayDriver.builder()
            .name(DEFAULT_DRIVER_NAME)
            .transport(GatewayTransport.MQTT)
            .protocol(GatewayProtocol.MODBUS_RTU)
            .supportsBroadcast(true)
            .build());

        log.info("Seeded default gateway driver: {}", DEFAULT_DRIVER_NAME);
    }

    /**
     * Seeds a global device profile + one poll group + three data points + one command.
     * Gives the UI a working profile to attach devices to without having to build
     * profile-editing UI yet.
     */
    private void seedDemoDeviceProfile() {
        if (deviceProfileRepository.findAllAvailableForTenant(null).stream()
                .anyMatch(p -> DEMO_PROFILE_NAME.equals(p.getName()))) {
            return;
        }

        DeviceProfile profile = deviceProfileRepository.save(DeviceProfile.builder()
            .tenant(null) // global
            .name(DEMO_PROFILE_NAME)
            .manufacturer("Acme")
            .model("EM-2000")
            .category(DeviceCategory.ENERGY_METER)
            .description("Sample global profile for testing — voltage, current, power")
            .build());

        PollGroup group = pollGroupRepository.save(PollGroup.builder()
            .profile(profile)
            .name("Electrical readings")
            .intervalSeconds(10)
            .startRegister(3000)
            .count(6)
            .build());

        dataPointRepository.save(DataPoint.builder()
            .profile(profile).pollGroup(group)
            .key("voltage_l1").label("Voltage L1")
            .registerNumber(3000).functionCode(3)
            .dataType(DataType.UINT16).wordCount(1)
            .byteOrder(ByteOrder.BIG_ENDIAN)
            .scaleFactor(new BigDecimal("0.1")).offset(BigDecimal.ZERO)
            .unit("V").minValue(new BigDecimal("0")).maxValue(new BigDecimal("500"))
            .displayWidget(DisplayWidget.GAUGE)
            .build());

        dataPointRepository.save(DataPoint.builder()
            .profile(profile).pollGroup(group)
            .key("current_l1").label("Current L1")
            .registerNumber(3002).functionCode(3)
            .dataType(DataType.UINT16).wordCount(1)
            .byteOrder(ByteOrder.BIG_ENDIAN)
            .scaleFactor(new BigDecimal("0.01")).offset(BigDecimal.ZERO)
            .unit("A").minValue(new BigDecimal("0")).maxValue(new BigDecimal("1000"))
            .displayWidget(DisplayWidget.NUMBER)
            .build());

        dataPointRepository.save(DataPoint.builder()
            .profile(profile).pollGroup(group)
            .key("power_kw").label("Active Power")
            .registerNumber(3004).functionCode(3)
            .dataType(DataType.UINT32).wordCount(2)
            .byteOrder(ByteOrder.BIG_ENDIAN)
            .scaleFactor(new BigDecimal("0.001")).offset(BigDecimal.ZERO)
            .unit("kW").minValue(new BigDecimal("0")).maxValue(new BigDecimal("10000"))
            .displayWidget(DisplayWidget.NUMBER)
            .build());

        commandTemplateRepository.save(CommandTemplate.builder()
            .profile(profile)
            .name("Reset Energy Counter")
            .description("Clears the cumulative energy total")
            .registerNumber(4000)
            .functionCode(6)
            .value(1)
            .confirmationRequired(true)
            .minRole(Role.OPERATOR)
            .build());

        log.info("Seeded demo device profile '{}' with 3 data points + 1 command", DEMO_PROFILE_NAME);
    }

    /**
     * Minimal profile: polls FC3 register 3002, count 1.
     * Use this to verify end-to-end data flow against a real slave device.
     */
    private void seedSingleRegisterTestProfile() {
        if (deviceProfileRepository.findAllAvailableForTenant(null).stream()
                .anyMatch(p -> TEST_PROFILE_NAME.equals(p.getName()))) {
            return;
        }

        DeviceProfile profile = deviceProfileRepository.save(DeviceProfile.builder()
            .tenant(null)
            .name(TEST_PROFILE_NAME)
            .category(DeviceCategory.SENSOR)
            .description("Reads a single holding register at address 3002 — for end-to-end validation")
            .build());

        PollGroup group = pollGroupRepository.save(PollGroup.builder()
            .profile(profile)
            .name("Register 3002")
            .intervalSeconds(10)
            .startRegister(3002)
            .count(1)
            .build());

        dataPointRepository.save(DataPoint.builder()
            .profile(profile).pollGroup(group)
            .key("value").label("Value")
            .registerNumber(3002).functionCode(3)
            .dataType(DataType.UINT16).wordCount(1)
            .byteOrder(ByteOrder.BIG_ENDIAN)
            .scaleFactor(BigDecimal.ONE).offset(BigDecimal.ZERO)
            .unit("raw")
            .displayWidget(DisplayWidget.NUMBER)
            .build());

        log.info("Seeded test profile '{}' (FC3 @ 3002, count 1)", TEST_PROFILE_NAME);
    }
}
