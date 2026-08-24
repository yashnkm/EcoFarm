package com.ecoFarm.service.profileimport;

import com.ecoFarm.domain.entity.CommandTemplate;
import com.ecoFarm.domain.entity.DataPoint;
import com.ecoFarm.domain.entity.PollGroup;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Writer;
import java.util.List;
import java.util.Map;

import static com.ecoFarm.service.profileimport.ProfileCsvColumns.*;

/** Writes a Device Profile's Poll Groups/Data Points/Commands out in the
 * shared CSV shape ProfileCsvParser reads back in — the two are kept in the
 * same file/package deliberately so the format can't drift between them. */
@Component
public class ProfileCsvWriter {

    public void write(Writer out, List<PollGroup> pollGroups, List<DataPoint> dataPoints, List<CommandTemplate> commands) throws IOException {
        // Poll group id -> name, so data points can reference it by name
        // instead of an id that means nothing outside this database.
        Map<java.util.UUID, String> pollGroupNames = pollGroups.stream()
            .collect(java.util.stream.Collectors.toMap(PollGroup::getId, PollGroup::getName));

        CSVFormat format = CSVFormat.DEFAULT.builder().setHeader(HEADERS).build();
        try (CSVPrinter printer = new CSVPrinter(out, format)) {
            for (PollGroup g : pollGroups) {
                printer.printRecord(row(m -> {
                    m.put(TYPE, ROW_TYPE_POLL_GROUP);
                    m.put(NAME, g.getName());
                    m.put(INTERVAL_SECONDS, g.getIntervalSeconds());
                    m.put(START_REGISTER, g.getStartRegister());
                    m.put(COUNT, g.getCount());
                    m.put(FUNCTION_CODE, g.getFunctionCode());
                }));
            }
            for (DataPoint dp : dataPoints) {
                printer.printRecord(row(m -> {
                    m.put(TYPE, ROW_TYPE_DATA_POINT);
                    m.put(KEY, dp.getKey());
                    m.put(NAME, dp.getLabel());
                    m.put(POLL_GROUP, pollGroupNames.get(dp.getPollGroup().getId()));
                    m.put(REGISTER, dp.getRegisterNumber());
                    m.put(DATA_TYPE, dp.getDataType());
                    m.put(WORD_COUNT, dp.getWordCount());
                    m.put(BYTE_ORDER, dp.getByteOrder());
                    m.put(SCALE_FACTOR, dp.getScaleFactor());
                    m.put(OFFSET, dp.getOffset());
                    m.put(UNIT, dp.getUnit());
                    m.put(MIN_VALUE, dp.getMinValue());
                    m.put(MAX_VALUE, dp.getMaxValue());
                    m.put(DISPLAY_WIDGET, dp.getDisplayWidget());
                    m.put(FALSE_LABEL, dp.getFalseLabel());
                    m.put(TRUE_LABEL, dp.getTrueLabel());
                }));
            }
            for (CommandTemplate c : commands) {
                printer.printRecord(row(m -> {
                    m.put(TYPE, ROW_TYPE_COMMAND);
                    m.put(KEY, c.getKey());
                    m.put(NAME, c.getName());
                    m.put(DESCRIPTION, c.getDescription());
                    m.put(REGISTER, c.getRegisterNumber());
                    m.put(FUNCTION_CODE, c.getFunctionCode());
                    // A prompt-for-value (setpoint) command's stored value
                    // is just a 0 placeholder — write it as blank instead,
                    // or a round-trip import would misread it as a fixed
                    // command that always sends 0.
                    if (!c.isPromptForValue()) m.put(VALUE, c.getValue());
                    m.put(OFF_VALUE, c.getOffValue());
                    m.put(STATUS_DATA_POINT_KEY, c.getStatusDataPointKey());
                    m.put(CATEGORY, c.getCategory());
                    m.put(SCALE_FACTOR, c.getScaleFactor());
                    m.put(OFFSET, c.getOffset());
                    m.put(UNIT, c.getUnit());
                    m.put(MIN_ROLE, c.getMinRole());
                    m.put(CONFIRMATION_REQUIRED, c.isConfirmationRequired());
                }));
            }
        }
    }

    private Object[] row(java.util.function.Consumer<Map<String, Object>> fill) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        for (String h : HEADERS) m.put(h, "");
        fill.accept(m);
        Object[] values = new Object[HEADERS.length];
        for (int i = 0; i < HEADERS.length; i++) {
            Object v = m.get(HEADERS[i]);
            values[i] = v != null ? v : "";
        }
        return values;
    }
}
