package com.asha.sync.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "health_records")

@Getter
@Setter
@NoArgsConstructor

public class HealthRecord {

    @Id
    private String id;

    @Column(name = "patient_name")
    private String patientName;

    private Integer age;

    private String phone;

    @Column(name = "patient_type")
    private String patientType;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    private String language;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_json", columnDefinition = "jsonb")
    private Map<String, Object> structured;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "source_device")
    private String sourceDevice;
}
