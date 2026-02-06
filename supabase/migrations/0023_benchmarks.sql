-- Benchmarking engine: anonymized percentile aggregates for portfolio metrics
CREATE TABLE metric_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  period_type TEXT NOT NULL,
  industry TEXT,
  stage TEXT,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  sample_size INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(metric_name, period_type, industry, stage)
);

-- No RLS needed — benchmarks are anonymized aggregates
-- Read access for authenticated investors
ALTER TABLE metric_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_benchmarks" ON metric_benchmarks FOR SELECT USING (auth.uid() IS NOT NULL);
