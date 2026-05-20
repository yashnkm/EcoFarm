package com.ecoFarm.ingestion;

import com.ecoFarm.domain.entity.DataPoint;
import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.DataType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Decodes raw Modbus register values into engineering values using a DataPoint config.
 *
 *   engineeringValue = (rawValue × scale_factor) + offset
 */
@Component
public class RegisterDecoder {

    /**
     * @param registers   full list of raw register values returned by the poll
     * @param startReg    first register number polled (from poll_group.start_register)
     * @param dp          data point definition
     * @return decoded double value, or null if registers are out of range
     */
    public Double decode(List<Integer> registers, int startReg, DataPoint dp) {
        int index = dp.getRegisterNumber() - startReg;
        if (index < 0 || index >= registers.size()) return null;

        int wordCount = dp.getWordCount();
        if (index + wordCount > registers.size()) return null;

        long raw = combineRegisters(registers, index, wordCount, dp.getByteOrder(), dp.getDataType());

        BigDecimal scaled = BigDecimal.valueOf(raw)
            .multiply(dp.getScaleFactor())
            .add(dp.getOffset());

        return scaled.doubleValue();
    }

    public int rawIntValue(List<Integer> registers, int startReg, DataPoint dp) {
        int index = dp.getRegisterNumber() - startReg;
        if (index < 0 || index >= registers.size()) return 0;
        return registers.get(index) & 0xFFFF;
    }

    private long combineRegisters(List<Integer> registers, int index, int wordCount,
                                  ByteOrder byteOrder, DataType dataType) {
        if (wordCount == 1) {
            int raw = registers.get(index) & 0xFFFF;
            if (dataType == DataType.INT16 && (raw & 0x8000) != 0) {
                return raw - 0x10000; // sign-extend
            }
            return raw;
        }

        // 32-bit (2 registers)
        int high = registers.get(index) & 0xFFFF;
        int low  = registers.get(index + 1) & 0xFFFF;

        long combined = byteOrder == ByteOrder.BIG_ENDIAN
            ? ((long) high << 16) | low
            : ((long) low  << 16) | high;

        return switch (dataType) {
            case INT32 -> (int) combined;
            case FLOAT32 -> Float.floatToIntBits(0) == 0
                ? (long) Float.intBitsToFloat((int) combined)
                : combined;
            default -> combined & 0xFFFFFFFFL;
        };
    }
}
