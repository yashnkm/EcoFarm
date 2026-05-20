package com.ecoFarm.domain.entity;

import com.ecoFarm.domain.enums.ByteOrder;
import com.ecoFarm.domain.enums.DataType;
import com.ecoFarm.domain.enums.DisplayWidget;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
    name = "data_points",
    uniqueConstraints = @UniqueConstraint(name = "uq_data_point_key", columnNames = {"profile_id", "key"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private DeviceProfile profile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_group_id")
    private PollGroup pollGroup;

    @Column(name = "key", nullable = false, length = 100)
    private String key;

    @Column(nullable = false)
    private String label;

    @Column(name = "register_number", nullable = false)
    private Integer registerNumber;

    @Column(name = "function_code", nullable = false)
    private Integer functionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    @Builder.Default
    private DataType dataType = DataType.UINT16;

    @Column(name = "word_count", nullable = false)
    @Builder.Default
    private Integer wordCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "byte_order", nullable = false, length = 20)
    @Builder.Default
    private ByteOrder byteOrder = ByteOrder.BIG_ENDIAN;

    @Column(name = "scale_factor", nullable = false, precision = 12, scale = 6)
    @Builder.Default
    private BigDecimal scaleFactor = BigDecimal.ONE;

    @Column(name = "offset_value", nullable = false, precision = 12, scale = 6)
    @Builder.Default
    private BigDecimal offset = BigDecimal.ZERO;

    @Column(length = 50)
    private String unit;

    @Column(name = "min_value", precision = 15, scale = 4)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 15, scale = 4)
    private BigDecimal maxValue;

    @Column(name = "is_writable", nullable = false)
    @Builder.Default
    private boolean writable = false;

    @Column(name = "is_displayed", nullable = false)
    @Builder.Default
    private boolean displayed = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "display_widget", nullable = false, length = 50)
    @Builder.Default
    private DisplayWidget displayWidget = DisplayWidget.NUMBER;
}
