package com.ecoFarm.ingestion;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LivePushService {

    private final SimpMessagingTemplate broker;

    public void pushReading(UUID tenantId, LiveReadingMessage msg) {
        broker.convertAndSend("/topic/tenant/" + tenantId + "/readings", msg);
    }

    public void pushAlert(UUID tenantId, AlertMessage msg) {
        broker.convertAndSend("/topic/tenant/" + tenantId + "/alerts", msg);
    }
}
