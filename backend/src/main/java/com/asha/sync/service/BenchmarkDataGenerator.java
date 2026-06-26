package com.asha.sync.service;

import com.asha.sync.model.HealthRecord;
import com.asha.sync.repository.HealthRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class BenchmarkDataGenerator {

    private final HealthRecordRepository healthRecordRepository;

    public BenchmarkDataGenerator(HealthRecordRepository healthRecordRepository) {
        this.healthRecordRepository = healthRecordRepository;
    }

    @Transactional
    public int generateRecords(int count) {
        // Deterministic seed for repeatable datasets
        Random random = new Random(42);

        String[] firstNames = {"Rajesh", "Priya", "Amit", "Sunita", "Anil", "Meena", "Sanjay", "Kavita", "Ramesh", "Deepa"};
        String[] lastNames = {"Sharma", "Patel", "Kumar", "Singh", "Joshi", "Verma", "Gupta", "Reddy", "Nair", "Das"};
        String[] patientTypes = {"PREGNANT", "CHILD", "ADULT", "ELDER"};
        String[] languages = {"en", "hi", "te", "ta"};
        String[] symptoms = {
            "Fever and headache for 3 days",
            "Swelling in feet and high blood pressure",
            "Severe breathing issues and cough",
            "Minor bleeding and mild fever",
            "Routine checkup, feeling normal",
            "Persistent cough and body ache for 5 days"
        };

        List<HealthRecord> batch = new ArrayList<>();
        int batchSize = 1000;
        int totalSaved = 0;

        for (int i = 1; i <= count; i++) {
            String id = "bench-record-" + i;
            String firstName = firstNames[random.nextInt(firstNames.length)];
            String lastName = lastNames[random.nextInt(lastNames.length)];
            String name = firstName + " " + lastName;
            
            String patientType = patientTypes[random.nextInt(patientTypes.length)];
            int age = 1 + random.nextInt(90);
            if ("PREGNANT".equals(patientType)) {
                age = 18 + random.nextInt(25);
            } else if ("CHILD".equals(patientType)) {
                age = 1 + random.nextInt(12);
            } else if ("ELDER".equals(patientType)) {
                age = 60 + random.nextInt(30);
            }

            String phone = "9" + String.format("%09d", random.nextInt(1000000000));
            String lang = languages[random.nextInt(languages.length)];
            String rawText = symptoms[random.nextInt(symptoms.length)];

            Map<String, Object> structured = new LinkedHashMap<>();
            structured.put("feverDays", random.nextInt(6));
            structured.put("swelling", random.nextBoolean());
            structured.put("highBP", random.nextBoolean());
            structured.put("bleeding", random.nextBoolean());
            structured.put("breathingIssue", random.nextBoolean());

            String riskLevel = "Low";
            if ("PREGNANT".equals(patientType)) {
                if (Boolean.TRUE.equals(structured.get("bleeding"))) {
                    riskLevel = "Critical";
                } else if (Boolean.TRUE.equals(structured.get("highBP")) && Boolean.TRUE.equals(structured.get("swelling"))) {
                    riskLevel = "High";
                } else if (asInt(structured.get("feverDays")) >= 4) {
                    riskLevel = "Medium";
                }
            } else {
                if (Boolean.TRUE.equals(structured.get("breathingIssue"))) {
                    riskLevel = "High";
                } else if (asInt(structured.get("feverDays")) >= 4) {
                    riskLevel = "Medium";
                }
            }

            // Deterministic timestamp range
            LocalDateTime created = LocalDateTime.ofEpochSecond(
                    1700000000L + random.nextInt(50000000), 0, ZoneOffset.UTC);

            HealthRecord record = new HealthRecord();
            record.setId(id);
            record.setPatientName(name);
            record.setAge(age);
            record.setPhone(phone);
            record.setPatientType(patientType);
            record.setRawText(rawText);
            record.setLanguage(lang);
            record.setStructured(structured);
            record.setRiskLevel(riskLevel);
            record.setCreatedAt(created);
            record.setUpdatedAt(created);
            record.setSourceDevice("device-generator");

            batch.add(record);

            if (batch.size() >= batchSize) {
                healthRecordRepository.saveAll(batch);
                totalSaved += batch.size();
                batch.clear();
            }
        }

        if (!batch.isEmpty()) {
            healthRecordRepository.saveAll(batch);
            totalSaved += batch.size();
        }

        return totalSaved;
    }

    private int asInt(Object obj) {
        if (obj instanceof Number num) {
            return num.intValue();
        }
        return 0;
    }
}
