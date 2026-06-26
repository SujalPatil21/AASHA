package com.asha.sync.controller;

import com.asha.sync.service.BenchmarkDataGenerator;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/benchmark")
public class BenchmarkController {

    private final BenchmarkDataGenerator benchmarkDataGenerator;

    public BenchmarkController(BenchmarkDataGenerator benchmarkDataGenerator) {
        this.benchmarkDataGenerator = benchmarkDataGenerator;
    }

    @PostMapping("/generate")
    public Map<String, Object> generateData(@RequestParam(defaultValue = "1000") int count) {
        int generated = benchmarkDataGenerator.generateRecords(count);
        return Map.of(
                "success", true,
                "count", generated,
                "message", "Deterministic benchmark dataset generated successfully"
        );
    }
}
