export type ExtractedMetric = {
  name: string;
  value: number | string;
  unit: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  confidence: number; // 0–1
  page_number: number | null;
  context: string | null; // surrounding text for provenance
};

export type ExtractionResult = {
  provider: string;
  model: string;
  extracted_at: string;
  period_detected: {
    type: string;
    start: string;
    end: string;
  } | null;
  metrics: ExtractedMetric[];
  processing_time_ms: number;
};

export interface MetricExtractor {
  extract(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
    targetMetrics?: string[],
  ): Promise<ExtractionResult>;
}
