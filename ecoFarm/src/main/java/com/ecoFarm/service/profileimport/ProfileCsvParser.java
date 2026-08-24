package com.ecoFarm.service.profileimport;

import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.CommandCategory;
import com.ecoFarm.domain.enums.DataType;
import com.ecoFarm.domain.enums.DisplayWidget;
import com.ecoFarm.domain.enums.Role;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.ecoFarm.service.profileimport.ProfileCsvColumns.*;

/**
 * Reads a Device Profile CSV (same shape ProfileCsvWriter exports) into
 * typed, per-row-validated records. Only checks things knowable from the
 * row alone (required fields present, numbers parse, enum values are real
 * ones) — cross-references (a DataPoint's PollGroup name actually existing,
 * a Command's StatusDataPointKey actually existing) need the rest of the
 * file and the import target, so that's ProfileImportService's job, not this
 * parser's.
 */
@Component
public class ProfileCsvParser {

    public record ParsedPollGroupRow(
        int rowNumber, String name, Integer intervalSeconds, Integer startRegister,
        Integer count, Integer functionCode, List<String> errors
    ) {}

    public record ParsedDataPointRow(
        int rowNumber, String key, String label, String pollGroupName, Integer register,
        DataType dataType, Integer wordCount, ByteOrder byteOrder, BigDecimal scaleFactor,
        BigDecimal offset, String unit, BigDecimal minValue, BigDecimal maxValue,
        DisplayWidget displayWidget, String falseLabel, String trueLabel, List<String> errors
    ) {}

    public record ParsedCommandRow(
        int rowNumber, String key, String name, String description, Integer register,
        Integer functionCode, Integer value, Integer offValue, String statusDataPointKey,
        CommandCategory category, BigDecimal scaleFactor, BigDecimal offset, String unit,
        Role minRole, Boolean confirmationRequired, boolean promptForValue, List<String> errors
    ) {}

    public record ParsedProfileCsv(
        List<ParsedPollGroupRow> pollGroups, List<ParsedDataPointRow> dataPoints,
        List<ParsedCommandRow> commands, List<String> fileErrors
    ) {}

    public ParsedProfileCsv parse(Reader reader) throws IOException {
        List<ParsedPollGroupRow> pollGroups = new ArrayList<>();
        List<ParsedDataPointRow> dataPoints = new ArrayList<>();
        List<ParsedCommandRow> commands = new ArrayList<>();
        List<String> fileErrors = new ArrayList<>();

        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreSurroundingSpaces(true)
            .build();

        try (CSVParser parser = new CSVParser(reader, format)) {
            for (CSVRecord rec : parser) {
                // +1 for the header row, +1 because getRecordNumber() is 0-based over data rows —
                // this lines up with what a spreadsheet's own row numbers would show.
                int rowNumber = (int) rec.getRecordNumber() + 1;
                String type = get(rec, TYPE);
                if (type == null || type.isBlank()) {
                    fileErrors.add("Row " + rowNumber + ": missing Type");
                    continue;
                }
                switch (type.trim().toLowerCase(Locale.ROOT)) {
                    case "pollgroup" -> pollGroups.add(parsePollGroup(rec, rowNumber));
                    case "datapoint" -> dataPoints.add(parseDataPoint(rec, rowNumber));
                    case "command" -> commands.add(parseCommand(rec, rowNumber));
                    default -> fileErrors.add("Row " + rowNumber + ": unknown Type '" + type + "' (expected PollGroup, DataPoint, or Command)");
                }
            }
        }

        return new ParsedProfileCsv(pollGroups, dataPoints, commands, fileErrors);
    }

    private ParsedPollGroupRow parsePollGroup(CSVRecord rec, int rowNumber) {
        List<String> errors = new ArrayList<>();
        String name = requireText(rec, NAME, rowNumber, errors);
        Integer interval = requireInt(rec, INTERVAL_SECONDS, rowNumber, errors);
        Integer startReg = requireInt(rec, START_REGISTER, rowNumber, errors);
        Integer count = requireInt(rec, COUNT, rowNumber, errors);
        Integer fc = requireInt(rec, FUNCTION_CODE, rowNumber, errors);
        return new ParsedPollGroupRow(rowNumber, name, interval, startReg, count, fc, errors);
    }

    private ParsedDataPointRow parseDataPoint(CSVRecord rec, int rowNumber) {
        List<String> errors = new ArrayList<>();
        String key = requireText(rec, KEY, rowNumber, errors);
        String label = requireText(rec, NAME, rowNumber, errors);
        String pollGroupName = requireText(rec, POLL_GROUP, rowNumber, errors);
        Integer register = requireInt(rec, REGISTER, rowNumber, errors);
        DataType dataType = requireEnum(rec, DATA_TYPE, DataType.class, rowNumber, errors);
        Integer wordCount = optionalInt(rec, WORD_COUNT, rowNumber, errors, 1);
        ByteOrder byteOrder = optionalEnum(rec, BYTE_ORDER, ByteOrder.class, rowNumber, errors, ByteOrder.BIG_ENDIAN);
        BigDecimal scale = optionalDecimal(rec, SCALE_FACTOR, rowNumber, errors, BigDecimal.ONE);
        BigDecimal offset = optionalDecimal(rec, OFFSET, rowNumber, errors, BigDecimal.ZERO);
        String unit = get(rec, UNIT);
        BigDecimal minValue = optionalDecimal(rec, MIN_VALUE, rowNumber, errors, null);
        BigDecimal maxValue = optionalDecimal(rec, MAX_VALUE, rowNumber, errors, null);
        DisplayWidget widget = optionalEnum(rec, DISPLAY_WIDGET, DisplayWidget.class, rowNumber, errors, DisplayWidget.NUMBER);
        String falseLabel = get(rec, FALSE_LABEL);
        String trueLabel = get(rec, TRUE_LABEL);
        return new ParsedDataPointRow(rowNumber, key, label, pollGroupName, register, dataType, wordCount,
            byteOrder, scale, offset, unit, minValue, maxValue, widget, falseLabel, trueLabel, errors);
    }

    private ParsedCommandRow parseCommand(CSVRecord rec, int rowNumber) {
        List<String> errors = new ArrayList<>();
        String key = requireText(rec, KEY, rowNumber, errors);
        String name = requireText(rec, NAME, rowNumber, errors);
        String description = get(rec, DESCRIPTION);
        Integer register = requireInt(rec, REGISTER, rowNumber, errors);
        Integer fc = optionalInt(rec, FUNCTION_CODE, rowNumber, errors, 6);
        Integer offValue = optionalInt(rec, OFF_VALUE, rowNumber, errors, null);
        String rawValue = get(rec, VALUE);
        // Which of the three command kinds this is follows from what's
        // actually filled in, same distinction CommandsTab's create dialog
        // makes explicit: OffValue present -> toggle (Value is the On
        // value, required). OffValue absent and Value blank -> setpoint,
        // the operator supplies the real value at send time, this cell is
        // just a placeholder. Otherwise -> a fixed single-value command.
        boolean isToggle = offValue != null;
        boolean promptForValue = !isToggle && rawValue == null;
        Integer value;
        if (promptForValue) {
            value = 0;
        } else if (rawValue == null) {
            errors.add("Row " + rowNumber + ": Value is required (the On value) when OffValue is set");
            value = 0;
        } else {
            Integer parsed = parseInt(rawValue, VALUE, rowNumber, errors);
            value = parsed != null ? parsed : 0;
        }
        String statusKey = get(rec, STATUS_DATA_POINT_KEY);
        CommandCategory category = optionalEnum(rec, CATEGORY, CommandCategory.class, rowNumber, errors, null);
        BigDecimal scale = optionalDecimal(rec, SCALE_FACTOR, rowNumber, errors, BigDecimal.ONE);
        BigDecimal offset = optionalDecimal(rec, OFFSET, rowNumber, errors, BigDecimal.ZERO);
        String unit = get(rec, UNIT);
        Role minRole = optionalEnum(rec, MIN_ROLE, Role.class, rowNumber, errors, Role.OPERATOR);
        Boolean confirmationRequired = optionalBoolean(rec, CONFIRMATION_REQUIRED, true);
        return new ParsedCommandRow(rowNumber, key, name, description, register, fc, value, offValue,
            statusKey == null || statusKey.isBlank() ? null : statusKey, category, scale, offset, unit,
            minRole, confirmationRequired, promptForValue, errors);
    }

    // ── field helpers ──────────────────────────────────────

    private String get(CSVRecord rec, String column) {
        if (!rec.isMapped(column)) return null;
        String v = rec.get(column);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private String requireText(CSVRecord rec, String column, int rowNumber, List<String> errors) {
        String v = get(rec, column);
        if (v == null) errors.add("Row " + rowNumber + ": " + column + " is required");
        return v;
    }

    private Integer requireInt(CSVRecord rec, String column, int rowNumber, List<String> errors) {
        String v = requireText(rec, column, rowNumber, errors);
        if (v == null) return null;
        return parseInt(v, column, rowNumber, errors);
    }

    private Integer optionalInt(CSVRecord rec, String column, int rowNumber, List<String> errors, Integer fallback) {
        String v = get(rec, column);
        if (v == null) return fallback;
        Integer parsed = parseInt(v, column, rowNumber, errors);
        return parsed != null ? parsed : fallback;
    }

    private Integer parseInt(String v, String column, int rowNumber, List<String> errors) {
        try {
            return Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            errors.add("Row " + rowNumber + ": " + column + " ('" + v + "') is not a whole number");
            return null;
        }
    }

    private BigDecimal optionalDecimal(CSVRecord rec, String column, int rowNumber, List<String> errors, BigDecimal fallback) {
        String v = get(rec, column);
        if (v == null) return fallback;
        try {
            return new BigDecimal(v.trim());
        } catch (NumberFormatException e) {
            errors.add("Row " + rowNumber + ": " + column + " ('" + v + "') is not a number");
            return fallback;
        }
    }

    private Boolean optionalBoolean(CSVRecord rec, String column, boolean fallback) {
        String v = get(rec, column);
        if (v == null) return fallback;
        String t = v.trim().toLowerCase(Locale.ROOT);
        return t.equals("y") || t.equals("yes") || t.equals("true") || t.equals("1");
    }

    private <E extends Enum<E>> E requireEnum(CSVRecord rec, String column, Class<E> type, int rowNumber, List<String> errors) {
        String v = requireText(rec, column, rowNumber, errors);
        if (v == null) return null;
        return parseEnum(v, column, type, rowNumber, errors);
    }

    private <E extends Enum<E>> E optionalEnum(CSVRecord rec, String column, Class<E> type, int rowNumber, List<String> errors, E fallback) {
        String v = get(rec, column);
        if (v == null) return fallback;
        E parsed = parseEnum(v, column, type, rowNumber, errors);
        return parsed != null ? parsed : fallback;
    }

    private <E extends Enum<E>> E parseEnum(String v, String column, Class<E> type, int rowNumber, List<String> errors) {
        for (E constant : type.getEnumConstants()) {
            if (constant.name().equalsIgnoreCase(v.trim())) return constant;
        }
        errors.add("Row " + rowNumber + ": " + column + " ('" + v + "') must be one of "
            + java.util.Arrays.toString(type.getEnumConstants()));
        return null;
    }
}
