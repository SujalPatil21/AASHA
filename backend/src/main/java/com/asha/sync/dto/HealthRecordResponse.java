package com.asha.sync.dto;

public class HealthRecordResponse {

    private final String id;
    private final String message;
    private final boolean synced;

    public HealthRecordResponse(String id, String message, boolean synced) {
        this.id = id;
        this.message = message;
        this.synced = synced;
    }

    public String getId() {
        return id;
    }

    public String getMessage() {
        return message;
    }

    public boolean isSynced() {
        return synced;
    }
}
