package com.ecoFarm.service;

import com.ecoFarm.api.v1.dto.response.DiskHealthResponse;
import com.ecoFarm.api.v1.dto.response.DiskHealthResponse.Level;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Disk usage of the filesystem the backend runs on, for the Ops Console.
 * Exists because a full disk (a 15 GB unrotated log plus a 5 GB unpurged
 * table) was only noticed by chance at 83% — nothing warned before it.
 */
@Service
public class DiskHealthService {

    static final double WARNING_PERCENT = 80.0;
    static final double CRITICAL_PERCENT = 90.0;

    public DiskHealthResponse current() {
        try {
            FileStore store = Files.getFileStore(Path.of("").toAbsolutePath());
            return compute(store.getTotalSpace(), store.getUnallocatedSpace(), store.getUsableSpace());
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read disk usage", e);
        }
    }

    /**
     * Same arithmetic as `df`: used = total - free, and the percentage is
     * used / (used + available), where "available" excludes blocks reserved
     * for root — so this matches the Use% an admin sees on the server itself.
     */
    static DiskHealthResponse compute(long total, long unallocated, long usable) {
        long used = total - unallocated;
        long denominator = used + usable;
        double percent = denominator > 0 ? Math.round(used * 1000.0 / denominator) / 10.0 : 0.0;
        Level level = percent >= CRITICAL_PERCENT ? Level.CRITICAL
            : percent >= WARNING_PERCENT ? Level.WARNING
            : Level.OK;
        return new DiskHealthResponse(total, used, usable, percent, level);
    }
}
