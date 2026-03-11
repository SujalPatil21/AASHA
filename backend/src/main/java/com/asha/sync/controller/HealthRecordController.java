package com.asha.sync.controller;

import com.asha.sync.dto.HealthRecordResponse;
import com.asha.sync.dto.HealthRecordUpsertRequest;
import com.asha.sync.model.HealthRecord;
import com.asha.sync.service.HealthRecordService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = {"", "/api"})
public class HealthRecordController {

    private final HealthRecordService healthRecordService;

    public HealthRecordController(HealthRecordService healthRecordService) {
        this.healthRecordService = healthRecordService;
    }

    @PostMapping("/records")
    public HealthRecordResponse createRecord(@Valid @RequestBody HealthRecordUpsertRequest request) {
        boolean saved = healthRecordService.saveFromRequest(request);
        String message = saved ? "Record saved successfully" : "Record already synced";

        return new HealthRecordResponse(
                request.getId(),
                message,
                true
        );
    }

    @GetMapping("/records")
    public Map<String, Object> getRecords(
            @RequestParam(defaultValue = "200") int limit
    ) {
        List<HealthRecord> records = healthRecordService.getAll(Math.max(1, Math.min(limit, 1000)));
        return Map.of(
                "records", records.stream().map(this::toApiRecord).toList(),
                "count", records.size()
        );
    }

    @GetMapping("/high-risk")
    public Map<String, Object> getHighRiskRecords(
            @RequestParam(defaultValue = "200") int limit
    ) {
        List<HealthRecord> records = healthRecordService.getHighRisk(Math.max(1, Math.min(limit, 1000)));
        return Map.of(
                "records", records.stream().map(this::toApiRecord).toList(),
                "count", records.size()
        );
    }

    @PostMapping("/sync")
    public Map<String, Object> syncRecords(@RequestBody List<HealthRecordUpsertRequest> records) {

        int saved = 0;
        int duplicates = 0;

        for (HealthRecordUpsertRequest record : records) {
            boolean inserted = healthRecordService.saveFromRequest(record);
            if (inserted) {
                saved++;
            } else {
                duplicates++;
            }
        }

        return Map.of(
                "synced", saved,
                "duplicates", duplicates,
                "message", "Records synced successfully"
        );
    }

    @GetMapping("/healthz")
    public Map<String, String> healthCheck() {
        return Map.of("status", "ok");
    }

    private Map<String, Object> toApiRecord(HealthRecord record) {
        Long createdAt = record.getCreatedAt() == null
                ? null
                : record.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", record.getId());
        response.put("patientName", record.getPatientName());
        response.put("age", record.getAge());
        response.put("phone", record.getPhone());
        response.put("patientType", record.getPatientType());
        response.put("rawText", record.getRawText());
        response.put("language", record.getLanguage());
        response.put("structured", record.getStructured());
        response.put("riskLevel", record.getRiskLevel() == null ? "Low" : record.getRiskLevel());
        response.put("createdAt", createdAt);
        response.put("sourceDevice", record.getSourceDevice());
        return response;
    }
}
