package com.asha.sync.service;

import com.asha.sync.dto.HealthRecordUpsertRequest;
import com.asha.sync.model.HealthRecord;
import com.asha.sync.repository.HealthRecordRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class HealthRecordService {


    private final HealthRecordRepository healthRecordRepository;
    private final RiskAssessmentService riskAssessmentService;

    public HealthRecordService(
            HealthRecordRepository healthRecordRepository,
            RiskAssessmentService riskAssessmentService) {

        this.healthRecordRepository = healthRecordRepository;
        this.riskAssessmentService = riskAssessmentService;
    }

    public boolean save(HealthRecord record) {
        if (record.getId() == null || record.getId().isBlank()) {
            record.setId(UUID.randomUUID().toString());
        }

        if (healthRecordRepository.existsById(record.getId())) {
            return false;
        }

        if (record.getCreatedAt() == null) {
            record.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        }

        String risk = riskAssessmentService.calculateRisk(
                record.getStructured(),
                record.getPatientType()
        );

        record.setRiskLevel(risk);

        healthRecordRepository.save(record);
        return true;
    }

    public boolean saveFromRequest(HealthRecordUpsertRequest request) {
        HealthRecord record = new HealthRecord();
        record.setId(request.getId());
        record.setPatientName(request.getPatientName());
        record.setAge(request.getAge());
        record.setPhone(request.getPhone());
        record.setPatientType(request.getPatientType());
        record.setRawText(request.getRawText());
        record.setLanguage(request.getLanguage());
        record.setStructured(request.getStructured());
        record.setSourceDevice(request.getSourceDevice());
        record.setCreatedAt(toDateTime(request.getCreatedAt()));
        return save(record);
    }

    @Transactional(readOnly = true)
    public List<HealthRecord> getAll(int limit) {
        return healthRecordRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public List<HealthRecord> getHighRisk(int limit) {
        return healthRecordRepository.findByRiskLevelInOrderByCreatedAtDesc(
                List.of("High", "Critical"),
                PageRequest.of(0, limit)
        );
    }

    private LocalDateTime toDateTime(Long epochMillis) {
        if (epochMillis == null) {
            return null;
        }
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
    }
}
