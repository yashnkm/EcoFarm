package com.ecoFarm.service;

import com.ecoFarm.repository.CommunicationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Nightly cleanup of the Ops Console's communication log. Every poll writes
 * a request row and a response row, so without a cap this table grows
 * without bound (it reached ~32M rows / 5 GB on prod) — and it's diagnostic
 * history only, not data anyone needs to keep for months.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunicationLogRetentionService {

    private static final int RETENTION_DAYS = 14;

    private final CommunicationLogRepository communicationLogRepository;

    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void purgeOldCommunicationLogs() {
        int deleted = communicationLogRepository.deleteOlderThan(Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS));
        log.info("Communication log retention cleanup: deleted {} rows", deleted);
    }
}
