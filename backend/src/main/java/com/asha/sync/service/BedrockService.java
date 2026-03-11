package com.asha.sync.service;

import com.asha.sync.dto.BedrockAnalysisResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BedrockService {

    private static final Logger logger = LoggerFactory.getLogger(BedrockService.class);

    private static final Pattern CODE_FENCE_PATTERN =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;
    private final BedrockRuntimeClient bedrockRuntimeClient;
    private final String modelId;

    public BedrockService(
            ObjectMapper objectMapper,
            @Value("${bedrock.model-id}") String modelId,
            @Value("${bedrock.region}") String region) {

        this.objectMapper = objectMapper;
        this.modelId = modelId;

        ClientOverrideConfiguration override = ClientOverrideConfiguration.builder()
                .apiCallTimeout(Duration.ofSeconds(30))
                .build();

        this.bedrockRuntimeClient = BedrockRuntimeClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .overrideConfiguration(override)
                .build();
    }

    public Optional<BedrockAnalysisResult> analyze(String observationText) {
        if (observationText == null || observationText.isBlank()) {
            return Optional.empty();
        }

        try {

            String prompt = buildPrompt(observationText);

            String requestBody = buildRequestBody(prompt);

            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(modelId)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromUtf8String(requestBody))
                    .build();

            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(request);

            String responseBody = response.body().asUtf8String();

            String modelText = extractModelText(responseBody);
            String jsonPayload = extractJsonPayload(modelText);

            JsonNode json = objectMapper.readTree(jsonPayload);

            Map<String, Object> structuredResult = json.path("structured").isObject()
                    ? objectMapper.convertValue(json.path("structured"), Map.class)
                    : Collections.emptyMap();

            String riskLevel = json.path("riskLevel").asText("LOW");
            String riskReason = json.path("riskReason").asText("");

            logger.info("AI risk classification generated");

            return Optional.of(
                    new BedrockAnalysisResult(structuredResult, riskLevel, riskReason)
            );

        } catch (Exception e) {

            logger.warn("Bedrock invocation failed", e);
            return Optional.empty();
        }
    }

    private String buildRequestBody(String prompt) {
        return objectMapper.createObjectNode()
                .putArray("messages")
                .addObject()
                .put("role", "user")
                .putArray("content")
                .addObject()
                .put("type", "text")
                .put("text", prompt)
                .toString();
    }

    private String buildPrompt(String observationText) {
        return """
You are a rural healthcare triage AI helping ASHA workers.

Analyze ASHA health observations.
Extract symptoms.
Detect pregnancy month.
Classify risk level.

Risk levels:
LOW
MEDIUM
HIGH
CRITICAL

Return STRICT JSON only:
{
 "structured": {
   "symptoms": [],
   "pregnancyMonth": null
 },
 "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
 "riskReason": "short explanation"
}

Observation:
%s
""".formatted(observationText);
    }

    private String extractModelText(String responseBody) throws Exception {

        JsonNode root = objectMapper.readTree(responseBody);

        JsonNode outputContent = root.path("output").path("message").path("content");
        if (outputContent.isArray() && outputContent.size() > 0) {
            JsonNode textNode = outputContent.get(0).path("text");
            if (textNode.isTextual()) {
                return textNode.asText();
            }
        }

        JsonNode choiceContent = root.path("choices");
        if (choiceContent.isArray() && choiceContent.size() > 0) {
            JsonNode contentNode = choiceContent.get(0).path("message").path("content");
            if (contentNode.isTextual()) {
                return contentNode.asText();
            }
        }

        JsonNode results = root.path("results");
        if (results.isArray() && results.size() > 0) {
            JsonNode outputText = results.get(0).path("outputText");
            if (outputText.isTextual()) {
                return outputText.asText();
            }
        }

        throw new IllegalArgumentException("Unexpected Bedrock response");
    }

    private String extractJsonPayload(String modelText) {
        if (modelText == null) {
            return "";
        }

        String trimmed = modelText.trim();
        Matcher matcher = CODE_FENCE_PATTERN.matcher(trimmed);
        if (matcher.find()) {
            trimmed = matcher.group(1).trim();
        }

        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1).trim();
        }

        return trimmed;
    }

    @PreDestroy
    public void shutdown(){
        bedrockRuntimeClient.close();
    }
}
