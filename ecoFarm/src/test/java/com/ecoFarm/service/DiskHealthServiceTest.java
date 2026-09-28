package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.response.DiskHealthResponse;
import com.ecoFarm.api.v1.dto.response.DiskHealthResponse.Level;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DiskHealthServiceTest {

    private static final long GB = 1_000_000_000L;

    @Test
    void matchesWhatDfShowedOnProd() {
        // df on prod: Size 49G, Used 40G, Avail 8.7G -> 82%. 5% of the disk is
        // reserved for root, so free (2.45) < avail is not a mistake here.
        DiskHealthResponse r = DiskHealthService.compute(49 * GB, 9_100_000_000L, 8_700_000_000L);
        assertEquals(39_900_000_000L, r.usedBytes());
        assertEquals(8_700_000_000L, r.freeBytes());
        assertEquals(82.1, r.usedPercent());
        assertEquals(Level.WARNING, r.level());
    }

    @Test
    void reservedBlocksAreNotCountedAsFree() {
        // total 100, free 20 but only 15 usable (5 reserved): used 80, 80/(80+15).
        DiskHealthResponse r = DiskHealthService.compute(100, 20, 15);
        assertEquals(84.2, r.usedPercent());
    }

    @Test
    void levelBoundaries() {
        assertEquals(Level.OK, DiskHealthService.compute(1000, 210, 210).level());        // 79.0%
        assertEquals(Level.WARNING, DiskHealthService.compute(1000, 200, 200).level());   // 80.0%
        assertEquals(Level.WARNING, DiskHealthService.compute(1000, 110, 110).level());   // 89.0%
        assertEquals(Level.CRITICAL, DiskHealthService.compute(1000, 100, 100).level());  // 90.0%
    }

    @Test
    void emptyOrUnreadableDiskDoesNotDivideByZero() {
        DiskHealthResponse r = DiskHealthService.compute(0, 0, 0);
        assertEquals(0.0, r.usedPercent());
        assertEquals(Level.OK, r.level());
    }
}
