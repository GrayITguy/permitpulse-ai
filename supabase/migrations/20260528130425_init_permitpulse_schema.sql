-- PermitPulse AI - Phase 1 Initial Schema
-- Core tables for permit leads, ingestion tracking, and user feedback

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- permits: canonical normalized permit records
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,                    -- e.g. 'chicago', 'austin', 'miami-dade'
  source_id TEXT NOT NULL,                 -- original ID from the city source
  permit_number TEXT,
  permit_type TEXT NOT NULL,               -- normalized (e.g. 'building', 'electrical', 'plumbing')
  permit_type_raw TEXT,                    -- original value from source
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT,                             -- e.g. 'issued', 'pending', 'expired'
  issue_date DATE,
  expiration_date DATE,
  valuation NUMERIC(12,2),
  contractor_name TEXT,
  contractor_license TEXT,
  description TEXT,
  raw_data JSONB,                          -- full original record for debugging
  normalized_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- ingestion_log: track daily runs per source
CREATE TABLE ingestion_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  status TEXT DEFAULT 'running',           -- running, success, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feedback: user thumbs up/down on leads + optional notes
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
  user_id TEXT,                            -- future: auth user id
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),  -- -1 = down, 1 = up
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_permits_source ON permits(source);
CREATE INDEX idx_permits_permit_type ON permits(permit_type);
CREATE INDEX idx_permits_issue_date ON permits(issue_date);
CREATE INDEX idx_permits_city_state ON permits(city, state);
CREATE INDEX idx_ingestion_log_source_date ON ingestion_log(source, run_date);
CREATE INDEX idx_feedback_permit_id ON feedback(permit_id);

-- Updated_at trigger for permits
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permits_updated_at
BEFORE UPDATE ON permits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - open for MVP, tighten later
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow all for now (MVP)
CREATE POLICY "Allow all on permits" ON permits FOR ALL USING (true);
CREATE POLICY "Allow all on ingestion_log" ON ingestion_log FOR ALL USING (true);
CREATE POLICY "Allow all on feedback" ON feedback FOR ALL USING (true);