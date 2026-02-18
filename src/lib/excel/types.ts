/** Supported file MIME types for upload */
export const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv", // .csv
] as const;

export const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_SHEETS = 50;
export const MAX_TOTAL_ROWS = 100_000;
export const MAX_SAMPLE_ROWS = 200;
export const MAX_SAMPLE_SHEETS = 5;

// --- Parsed workbook types ---

export type CellValue = string | number | boolean | null;

export type ParsedSheet = {
  name: string;
  rows: CellValue[][];
  totalRows: number;
  totalCols: number;
};

export type ParsedWorkbook = {
  sheets: ParsedSheet[];
  totalRows: number;
  fileName: string;
};

// --- AI analysis types ---

export type LayoutType =
  | "metrics_as_rows"
  | "metrics_as_columns"
  | "single_metric_per_sheet"
  | "tabular";

export type TabularColumnMapping = {
  companyColIndex: number;
  metricColIndex: number;
  periodColIndex: number;
  valueColIndex: number;
  headerRowIndex: number;
};

export type DetectedCompany = {
  name: string;
  source: "sheet_name" | "column_value" | "header_label";
  sheetName?: string;
};

export type MetricMapping = {
  originalLabel: string;
  canonicalName: string;
  rowIndex?: number;
  colIndex?: number;
};

export type PeriodMapping = {
  originalLabel: string;
  periodType: "monthly" | "quarterly" | "annual";
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  rowIndex?: number;
  colIndex?: number;
};

export type DetectedValue = {
  metricName: string;
  rawValue: string;
  numericValue: number | null;
  unit: string | null;
  periodType: "monthly" | "quarterly" | "annual";
  periodStart: string;
  periodEnd: string;
  companyName: string | null;
  sheetName: string;
  cellReference: string;
  confidence: number;
};

export type AIAnalysisResult = {
  layout: LayoutType;
  companiesDetected: DetectedCompany[];
  metricMappings: MetricMapping[];
  periodMappings: PeriodMapping[];
  scaleMultiplier: number;
  values: DetectedValue[];
  provider: string;
  model: string;
  tabularMapping?: TabularColumnMapping;
};

// --- Company mapping types ---

export type CompanyMatch = {
  detectedName: string;
  companyId: string | null;
  companyName: string | null;
  confidence: number;
  autoMatched: boolean;
};

// --- Conflict detection types ---

export type ConflictInfo = {
  type: "existing_value" | "duplicate_in_upload";
  existingValue?: {
    raw: string;
    unit?: string;
    source?: string;
    submittedAt?: string;
  };
  duplicateValueId?: string;
};

// --- Upload value (for DB insert) ---

export type UploadValueInsert = {
  upload_id: string;
  company_id: string | null;
  company_name_detected: string | null;
  metric_name: string;
  period_type: "monthly" | "quarterly" | "annual";
  period_start: string;
  period_end: string;
  value: { raw: string; unit: string | null };
  ai_confidence: number;
  sheet_name: string;
  cell_reference: string;
  status: "pending" | "conflict";
  conflict_type: string | null;
  conflict_existing_value: Record<string, unknown> | null;
};

// --- Processing result ---

export type ProcessingResult = {
  uploadId: string;
  totalValues: number;
  companiesDetected: DetectedCompany[];
  conflicts: number;
  aiProvider: string;
  aiModel: string;
  parsingTimeMs: number;
};

// --- Upload status from DB ---

export type HistoricalUpload = {
  id: string;
  user_id: string;
  user_role: "investor" | "founder";
  organization_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: "processing" | "parsed" | "reviewing" | "completed" | "failed";
  ai_provider: string | null;
  ai_model: string | null;
  parsing_time_ms: number | null;
  total_values_detected: number;
  total_values_approved: number;
  total_values_rejected: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type HistoricalUploadValue = {
  id: string;
  upload_id: string;
  company_id: string | null;
  company_name_detected: string | null;
  metric_name: string;
  period_type: "monthly" | "quarterly" | "annual";
  period_start: string;
  period_end: string;
  value: { raw: string; unit: string | null };
  ai_confidence: number | null;
  sheet_name: string | null;
  cell_reference: string | null;
  status: "pending" | "approved" | "rejected" | "conflict";
  conflict_type: string | null;
  conflict_existing_value: Record<string, unknown> | null;
  user_edited_value: string | null;
  user_edited_metric_name: string | null;
  user_edited_period_start: string | null;
  user_edited_period_end: string | null;
  created_at: string;
};
