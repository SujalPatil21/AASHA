package com.asha.sync.dto;

import java.util.Map;

public record BedrockAnalysisResult(
        Map<String, Object> structured,
        String riskLevel,
        String riskReason
) {}
