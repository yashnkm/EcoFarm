package com.ecoFarm.service.profileimport;

/**
 * The single column list shared by export (writer) and import (parser) for
 * Device Profile CSVs — one flat file, a Type column distinguishing
 * PollGroup/DataPoint/Command rows, columns are the union of all three
 * entities' fields (blank where not applicable to that row's Type). Column
 * names/enum vocabulary mirror what DataPointsTab/CommandsTab/PollGroupsTab
 * already use in the UI, so an exported file reads the same way the forms do.
 */
public final class ProfileCsvColumns {

    private ProfileCsvColumns() {}

    public static final String TYPE = "Type";
    public static final String KEY = "Key";
    public static final String NAME = "Name";
    public static final String DESCRIPTION = "Description";
    public static final String POLL_GROUP = "PollGroup";
    public static final String REGISTER = "Register";
    public static final String DATA_TYPE = "DataType";
    public static final String WORD_COUNT = "WordCount";
    public static final String BYTE_ORDER = "ByteOrder";
    public static final String SCALE_FACTOR = "ScaleFactor";
    public static final String OFFSET = "Offset";
    public static final String UNIT = "Unit";
    public static final String MIN_VALUE = "MinValue";
    public static final String MAX_VALUE = "MaxValue";
    public static final String DISPLAY_WIDGET = "DisplayWidget";
    public static final String FALSE_LABEL = "FalseLabel";
    public static final String TRUE_LABEL = "TrueLabel";
    public static final String FUNCTION_CODE = "FunctionCode";
    public static final String VALUE = "Value";
    public static final String OFF_VALUE = "OffValue";
    public static final String STATUS_DATA_POINT_KEY = "StatusDataPointKey";
    public static final String CATEGORY = "Category";
    public static final String MIN_ROLE = "MinRole";
    public static final String CONFIRMATION_REQUIRED = "ConfirmationRequired";
    public static final String INTERVAL_SECONDS = "IntervalSeconds";
    public static final String START_REGISTER = "StartRegister";
    public static final String COUNT = "Count";

    public static final String ROW_TYPE_POLL_GROUP = "PollGroup";
    public static final String ROW_TYPE_DATA_POINT = "DataPoint";
    public static final String ROW_TYPE_COMMAND = "Command";

    public static final String[] HEADERS = {
        TYPE, KEY, NAME, DESCRIPTION, POLL_GROUP, REGISTER, DATA_TYPE, WORD_COUNT, BYTE_ORDER,
        SCALE_FACTOR, OFFSET, UNIT, MIN_VALUE, MAX_VALUE, DISPLAY_WIDGET, FALSE_LABEL, TRUE_LABEL,
        FUNCTION_CODE, VALUE, OFF_VALUE, STATUS_DATA_POINT_KEY, CATEGORY, MIN_ROLE,
        CONFIRMATION_REQUIRED, INTERVAL_SECONDS, START_REGISTER, COUNT
    };
}
