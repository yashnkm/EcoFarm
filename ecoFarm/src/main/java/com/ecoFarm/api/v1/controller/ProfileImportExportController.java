package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.response.DeviceProfileResponse;
import com.ecoFarm.api.v1.dto.response.ImportPreviewResponse;
import com.ecoFarm.api.v1.mapper.DeviceProfileMapper;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DataPointRepository;
import com.ecoFarm.repository.PollGroupRepository;
import com.ecoFarm.service.DeviceProfileService;
import com.ecoFarm.service.profileimport.ProfileCsvWriter;
import com.ecoFarm.service.profileimport.ProfileImportService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProfileImportExportController {

    private final DeviceProfileService profileService;
    private final PollGroupRepository pollGroupRepository;
    private final DataPointRepository dataPointRepository;
    private final CommandTemplateRepository commandTemplateRepository;
    private final ProfileCsvWriter csvWriter;
    private final ProfileImportService importService;
    private final DeviceProfileMapper profileMapper;

    @GetMapping("/device-profiles/{id}/export")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR')")
    public void export(@PathVariable UUID id, HttpServletResponse response) throws IOException {
        var profile = profileService.findAvailable(id);
        var pollGroups = pollGroupRepository.findByProfileId(id);
        var dataPoints = dataPointRepository.findByProfileId(id);
        var commands = commandTemplateRepository.findByProfileId(id);

        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"" + profile.getName().replaceAll("[^a-zA-Z0-9-_]", "_") + ".csv\"");

        try (var writer = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8)) {
            csvWriter.write(writer, pollGroups, dataPoints, commands);
        }
    }

    @PostMapping(value = "/device-profiles/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ImportPreviewResponse previewImport(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "targetProfileId", required = false) UUID targetProfileId
    ) throws IOException {
        return importService.preview(file, targetProfileId);
    }

    @PostMapping(value = "/device-profiles/import/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public DeviceProfileResponse applyImport(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "targetProfileId", required = false) UUID targetProfileId,
        @RequestParam(value = "newProfileName", required = false) String newProfileName
    ) throws IOException {
        var profile = importService.apply(file, targetProfileId, newProfileName);
        return profileMapper.toResponse(profile);
    }
}
