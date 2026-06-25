package com.asha.sync;

import com.asha.sync.controller.HealthRecordController;
import com.asha.sync.dto.HealthRecordUpsertRequest;
import com.asha.sync.service.HealthRecordService;
import com.asha.sync.config.JacksonConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HealthRecordController.class)
@Import(JacksonConfig.class)
public class HealthRecordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private HealthRecordService healthRecordService;

    @Test
    public void testGetRecords() throws Exception {
        when(healthRecordService.getAll(any(Integer.class))).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/records")
                .header("Origin", "https://aasha.pages.dev"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aasha.pages.dev"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(jsonPath("$.records").isArray())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    public void testCreateRecord() throws Exception {
        when(healthRecordService.saveFromRequest(any(HealthRecordUpsertRequest.class))).thenReturn(true);

        HealthRecordUpsertRequest request = new HealthRecordUpsertRequest();
        request.setId("test-id-123");
        request.setPatientName("John Doe");
        request.setAge(45);
        request.setPatientType("General");
        request.setRawText("Patient is feeling well");
        request.setLanguage("en");

        mockMvc.perform(post("/api/records")
                .header("Origin", "https://aasha.pages.dev")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aasha.pages.dev"))
                .andExpect(jsonPath("$.id").value("test-id-123"))
                .andExpect(jsonPath("$.synced").value(true));
    }

    @Test
    public void testSyncRecords() throws Exception {
        when(healthRecordService.saveFromRequest(any(HealthRecordUpsertRequest.class))).thenReturn(true);

        HealthRecordUpsertRequest request = new HealthRecordUpsertRequest();
        request.setId("test-id-123");
        request.setPatientName("John Doe");
        request.setAge(45);
        request.setPatientType("General");
        request.setRawText("Patient is feeling well");
        request.setLanguage("en");

        mockMvc.perform(post("/api/sync")
                .header("Origin", "https://aasha.pages.dev")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(request))))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aasha.pages.dev"))
                .andExpect(jsonPath("$.synced").value(1));
    }

    @Test
    public void testDeleteRecord() throws Exception {
        when(healthRecordService.delete("test-id-123")).thenReturn(true);

        mockMvc.perform(delete("/api/records/test-id-123")
                .header("Origin", "https://aasha.pages.dev"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aasha.pages.dev"))
                .andExpect(jsonPath("$.deleted").value(true));
    }

    @Test
    public void testCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/records")
                .header("Origin", "https://aasha.pages.dev")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type, Accept, Origin"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aasha.pages.dev"))
                .andExpect(header().string("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS"))
                .andExpect(header().string("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Origin"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }
}
