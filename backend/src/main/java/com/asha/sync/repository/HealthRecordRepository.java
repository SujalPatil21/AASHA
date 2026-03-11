package com.asha.sync.repository;

import com.asha.sync.model.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, String> {
    List<HealthRecord> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<HealthRecord> findByRiskLevelInOrderByCreatedAtDesc(List<String> riskLevels, Pageable pageable);
}
