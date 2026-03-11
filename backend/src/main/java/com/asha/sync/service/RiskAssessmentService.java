package com.asha.sync.service;

import com.asha.sync.model.PatientType;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Locale;

@Service
public class RiskAssessmentService {

    public String calculateRisk(Map<String, Object> structured, String patientTypeRaw) {
        if (structured == null) {
            return "Low";
        }

        int feverDays = asInt(structured.get("feverDays"), 0);
        boolean swelling = asBoolean(structured.get("swelling"));
        boolean highBP = asBoolean(structured.get("highBP"));
        boolean bleeding = asBoolean(structured.get("bleeding"));
        boolean breathingIssue = asBoolean(structured.get("breathingIssue"));
        PatientType patientType = normalizePatientType(patientTypeRaw);

        switch (patientType) {

            case PREGNANT:
                if (bleeding) return "Critical";
                if (highBP && swelling) return "High";
                if (feverDays >= 4) return "Medium";
                if (swelling) return "Medium";
                return "Low";

            case CHILD:
                if (breathingIssue) return "High";
                if (feverDays >= 4) return "Medium";
                return "Low";

            case ADULT:
                if (breathingIssue) return "High";
                if (feverDays >= 5) return "Medium";
                return "Low";

            case ELDER:
                if (breathingIssue) return "High";
                if (feverDays >= 3) return "Medium";
                return "Low";

            default:
                return "Low";
        }
    }

    private PatientType normalizePatientType(String patientTypeRaw) {
        if (patientTypeRaw == null || patientTypeRaw.isBlank()) {
            return PatientType.ADULT;
        }

        String normalized = patientTypeRaw.trim().toUpperCase(Locale.ROOT);
        if ("GENERAL".equals(normalized)) {
            return PatientType.ADULT;
        }

        try {
            return PatientType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return PatientType.ADULT;
        }
    }

    private int asInt(Object value, int defaultValue) {
        if (value instanceof Number number) {
            return number.intValue();
        }

        if (value instanceof String str) {
            try {
                return Integer.parseInt(str);
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }

        return defaultValue;
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String str) {
            return Boolean.parseBoolean(str);
        }
        return false;
    }
}
