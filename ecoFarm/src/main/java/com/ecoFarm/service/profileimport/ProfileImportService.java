package com.ecoFarm.service.profileimport;

import com.ecoFarm.api.v1.dto.request.CreateDeviceProfileRequest;
import com.ecoFarm.api.v1.dto.request.CommandTemplateRequest;
import com.ecoFarm.api.v1.dto.request.DataPointRequest;
import com.ecoFarm.api.v1.dto.request.PollGroupRequest;
import com.ecoFarm.api.v1.dto.response.ImportPreviewResponse;
import com.ecoFarm.api.v1.dto.response.ImportRowResult;
import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.DataPoint;
import com.ecoFarm.domain.entity.DeviceProfile;
import com.ecoFarm.domain.entity.PollGroup;
import com.ecoFarm.repository.CommandTemplateRepository;
import com.ecoFarm.repository.DataPointRepository;
import com.ecoFarm.repository.PollGroupRepository;
import com.ecoFarm.service.CommandTemplateService;
import com.ecoFarm.service.DataPointService;
import com.ecoFarm.service.DeviceProfileService;
import com.ecoFarm.service.PollGroupService;
import com.ecoFarm.service.profileimport.ProfileCsvParser.ParsedCommandRow;
import com.ecoFarm.service.profileimport.ProfileCsvParser.ParsedDataPointRow;
import com.ecoFarm.service.profileimport.ProfileCsvParser.ParsedPollGroupRow;
import com.ecoFarm.service.profileimport.ProfileCsvParser.ParsedProfileCsv;
import com.ecoFarm.shared.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Turns an uploaded Device Profile CSV into either a validation-only preview
 * (nothing persisted) or a real import. Both paths run the exact same
 * cross-reference validation (buildReport) against the same target, so they
 * can never disagree about what a given file means — apply() re-validates
 * from scratch rather than trusting a client-held preview result, and
 * refuses to persist anything if any row still has errors.
 *
 * Order matters on apply: Poll Groups first (Data Points reference them by
 * name), then Data Points (Commands' StatusDataPointKey references them by
 * key), then Commands.
 */
@Service
@RequiredArgsConstructor
public class ProfileImportService {

    private final ProfileCsvParser parser;
    private final DeviceProfileService profileService;
    private final PollGroupService pollGroupService;
    private final DataPointService dataPointService;
    private final CommandTemplateService commandTemplateService;
    private final PollGroupRepository pollGroupRepository;
    private final DataPointRepository dataPointRepository;
    private final CommandTemplateRepository commandTemplateRepository;

    public ImportPreviewResponse preview(MultipartFile file, UUID targetProfileId) throws IOException {
        ParsedProfileCsv csv = parseFile(file);
        return buildReport(csv, targetProfileId);
    }

    @Transactional
    public DeviceProfile apply(MultipartFile file, UUID targetProfileId, String newProfileName) throws IOException {
        ParsedProfileCsv csv = parseFile(file);

        UUID effectiveProfileId = targetProfileId;
        if (effectiveProfileId == null) {
            if (newProfileName == null || newProfileName.isBlank()) {
                throw ApiException.badRequest("A name is required to create a new profile from this import");
            }
            DeviceProfile created = profileService.create(
                new CreateDeviceProfileRequest(newProfileName, null, null, null, null, false));
            effectiveProfileId = created.getId();
        }

        ImportPreviewResponse report = buildReport(csv, effectiveProfileId);
        if (report.hasErrors()) {
            throw ApiException.badRequest(
                "Import has " + report.errorCount() + " row error(s) — nothing was saved. Fix the file and try again.");
        }

        Map<String, UUID> pollGroupIdsByName = new HashMap<>();
        for (PollGroup existing : pollGroupRepository.findByProfileId(effectiveProfileId)) {
            pollGroupIdsByName.put(existing.getName(), existing.getId());
        }
        for (ParsedPollGroupRow row : csv.pollGroups()) {
            PollGroupRequest req = new PollGroupRequest(
                row.name(), row.intervalSeconds(), row.startRegister(), row.count(), row.functionCode());
            UUID existingId = pollGroupIdsByName.get(row.name());
            PollGroup saved = existingId != null
                ? pollGroupService.update(effectiveProfileId, existingId, req)
                : pollGroupService.create(effectiveProfileId, req);
            pollGroupIdsByName.put(row.name(), saved.getId());
        }

        Map<String, UUID> dataPointIdsByKey = new HashMap<>();
        for (DataPoint existing : dataPointRepository.findByProfileId(effectiveProfileId)) {
            dataPointIdsByKey.put(existing.getKey(), existing.getId());
        }
        for (ParsedDataPointRow row : csv.dataPoints()) {
            UUID pollGroupId = pollGroupIdsByName.get(row.pollGroupName());
            DataPointRequest req = new DataPointRequest(
                row.key(), row.label(), row.register(), row.dataType(), row.wordCount(), row.byteOrder(),
                row.scaleFactor(), row.offset(), row.unit(), row.minValue(), row.maxValue(),
                null, null, row.displayWidget(), pollGroupId, null, row.falseLabel(), row.trueLabel());
            UUID existingId = dataPointIdsByKey.get(row.key());
            DataPoint saved = existingId != null
                ? dataPointService.update(effectiveProfileId, existingId, req)
                : dataPointService.create(effectiveProfileId, req);
            dataPointIdsByKey.put(row.key(), saved.getId());
        }

        Map<String, UUID> commandIdsByKey = new HashMap<>();
        for (CommandTemplate existing : commandTemplateRepository.findByProfileId(effectiveProfileId)) {
            if (existing.getKey() != null) commandIdsByKey.put(existing.getKey(), existing.getId());
        }
        for (ParsedCommandRow row : csv.commands()) {
            CommandTemplateRequest req = new CommandTemplateRequest(
                row.name(), row.key(), row.description(), row.register(), row.functionCode(), row.value(),
                row.confirmationRequired(), row.minRole(), row.promptForValue(), row.offValue(),
                row.statusDataPointKey(), row.category(), row.scaleFactor(), row.offset(), row.unit());
            UUID existingId = commandIdsByKey.get(row.key());
            if (existingId != null) commandTemplateService.update(effectiveProfileId, existingId, req);
            else commandTemplateService.create(effectiveProfileId, req);
        }

        return profileService.findAvailable(effectiveProfileId);
    }

    private ParsedProfileCsv parseFile(MultipartFile file) throws IOException {
        try (var reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            return parser.parse(reader);
        }
    }

    private ImportPreviewResponse buildReport(ParsedProfileCsv csv, UUID targetProfileId) {
        List<PollGroup> existingGroups = targetProfileId != null ? pollGroupRepository.findByProfileId(targetProfileId) : List.of();
        List<DataPoint> existingDataPoints = targetProfileId != null ? dataPointRepository.findByProfileId(targetProfileId) : List.of();
        List<CommandTemplate> existingCommands = targetProfileId != null ? commandTemplateRepository.findByProfileId(targetProfileId) : List.of();

        Set<String> existingGroupNames = existingGroups.stream().map(PollGroup::getName).collect(Collectors.toSet());
        Set<String> existingDataPointKeys = existingDataPoints.stream().map(DataPoint::getKey).collect(Collectors.toSet());
        Set<String> existingCommandKeys = existingCommands.stream().map(CommandTemplate::getKey)
            .filter(Objects::nonNull).collect(Collectors.toSet());

        // Names/keys a cross-reference can resolve against: whatever's
        // already in the target profile, plus whatever this same file
        // introduces — a DataPoint can reference a PollGroup defined
        // earlier in the same CSV, not just a pre-existing one.
        Set<String> resolvableGroupNames = new HashSet<>(existingGroupNames);
        csv.pollGroups().forEach(r -> { if (r.name() != null) resolvableGroupNames.add(r.name()); });

        Set<String> resolvableDataPointKeys = new HashSet<>(existingDataPointKeys);
        csv.dataPoints().forEach(r -> { if (r.key() != null) resolvableDataPointKeys.add(r.key()); });

        List<ImportRowResult> rows = new ArrayList<>();

        for (ParsedPollGroupRow r : csv.pollGroups()) {
            List<String> errors = new ArrayList<>(r.errors());
            String action = r.name() != null && existingGroupNames.contains(r.name()) ? "update" : "create";
            rows.add(new ImportRowResult(r.rowNumber(), "PollGroup", r.name(), action, errors));
        }

        for (ParsedDataPointRow r : csv.dataPoints()) {
            List<String> errors = new ArrayList<>(r.errors());
            if (r.pollGroupName() != null && !resolvableGroupNames.contains(r.pollGroupName())) {
                errors.add("PollGroup '" + r.pollGroupName() + "' not found in this file or the target profile");
            }
            String action = r.key() != null && existingDataPointKeys.contains(r.key()) ? "update" : "create";
            rows.add(new ImportRowResult(r.rowNumber(), "DataPoint", r.key(), action, errors));
        }

        for (ParsedCommandRow r : csv.commands()) {
            List<String> errors = new ArrayList<>(r.errors());
            if (r.statusDataPointKey() != null && !resolvableDataPointKeys.contains(r.statusDataPointKey())) {
                errors.add("StatusDataPointKey '" + r.statusDataPointKey() + "' not found in this file or the target profile");
            }
            String action = r.key() != null && existingCommandKeys.contains(r.key()) ? "update" : "create";
            rows.add(new ImportRowResult(r.rowNumber(), "Command", r.key(), action, errors));
        }

        int newCount = (int) rows.stream().filter(row -> row.action().equals("create") && row.errors().isEmpty()).count();
        int updateCount = (int) rows.stream().filter(row -> row.action().equals("update") && row.errors().isEmpty()).count();
        int errorCount = (int) rows.stream().filter(row -> !row.errors().isEmpty()).count();

        return new ImportPreviewResponse(newCount, updateCount, errorCount, rows, csv.fileErrors());
    }
}
