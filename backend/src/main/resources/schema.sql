CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    age INTEGER,
    phone TEXT,
    patient_type TEXT,
    raw_text TEXT,
    language TEXT,
    structured_json JSONB,
    risk_level TEXT,
    created_at TIMESTAMP,
    source_device TEXT
);

ALTER TABLE health_records ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS patient_type TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS raw_text TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS structured_json JSONB;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS source_device TEXT;

ALTER TABLE health_records ALTER COLUMN pregnancy_month DROP NOT NULL;
ALTER TABLE health_records ALTER COLUMN symptoms DROP NOT NULL;
ALTER TABLE health_records ALTER COLUMN sync_status DROP NOT NULL;

ALTER TABLE health_records DROP CONSTRAINT IF EXISTS health_records_pregnancy_month_check;
ALTER TABLE health_records DROP CONSTRAINT IF EXISTS health_records_sync_status_check;
ALTER TABLE health_records DROP CONSTRAINT IF EXISTS health_records_risk_level_check;
ALTER TABLE health_records DROP CONSTRAINT IF EXISTS health_records_patient_type_check;

CREATE INDEX IF NOT EXISTS idx_health_records_created_at ON health_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_risk_level ON health_records(risk_level);
