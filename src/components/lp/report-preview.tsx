"use client";

import { forwardRef } from "react";
import DOMPurify from "dompurify";
import { getReportTheme, type ReportThemeColors } from "@/lib/lp/report-themes";

type PerformanceSnapshot = {
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
  moic: number | null;
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
};

type InvestmentSnapshot = {
  id: string;
  company: string;
  invested: number;
  current: number;
  realized: number;
};

type CompanyMetricValue = {
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: string | number;
};

type CompanyMetricsPage = {
  companyName: string;
  invested: number;
  current: number;
  realized: number;
  metrics: CompanyMetricValue[];
  metricOrder?: string[];
};

type ReportPreviewProps = {
  fundName: string;
  title: string;
  reportDate: string;
  reportType: string;
  currency: string;
  performance: PerformanceSnapshot;
  investments: InvestmentSnapshot[];
  quarterlySummary: string;
  theme?: ReportThemeColors;
  companyMetrics?: Record<string, CompanyMetricsPage>;
};

/* ---------- Formatting helpers ---------- */

function fmtCurrency(value: number | null, currency: string): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtMultiple(value: number | null): string {
  if (value == null) return "-";
  return `${value.toFixed(2)}x`;
}

function fmtPercent(value: number | null): string {
  if (value == null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMOIC(invested: number, current: number, realized: number): string {
  if (invested === 0) return "-";
  return `${((current + realized) / invested).toFixed(2)}x`;
}

function formatPeriodLabel(periodStart: string, periodType: string): string {
  const d = new Date(periodStart + "T00:00:00");
  const month = d.getMonth();
  const year = d.getFullYear();
  const shortYear = `'${String(year).slice(2)}`;

  if (periodType === "monthly") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month]} ${shortYear}`;
  }
  if (periodType === "quarterly") {
    const q = Math.floor(month / 3) + 1;
    return `Q${q} ${shortYear}`;
  }
  return `${year}`;
}

function formatMetricValue(value: string | number, metricName: string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  const lower = metricName.toLowerCase();
  const isPercent = /(rate|margin|churn|retention|conversion|nrr|grr)/.test(lower);
  const isCurrency = /(revenue|mrr|arr|burn|runway|cac|ltv|arpu|aov|expense|cost|spend|income|profit|ebitda|cash|gmv|invested|salary|valuation)/.test(lower);

  if (isPercent) {
    return `${num.toFixed(1)}%`;
  }
  if (isCurrency) {
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  }
  return num.toLocaleString();
}

/* ---------- Sanitization for quarterly summary ---------- */

const ALLOWED_TAGS = ["p", "br", "strong", "em", "ul", "ol", "li", "a", "span"];
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });
}

/* ---------- Sub-components ---------- */

function KPICard({ label, value, colors }: { label: string; value: string; colors: ReportThemeColors }) {
  return (
    <div
      style={{
        backgroundColor: colors.kpiCardBg,
        border: `1px solid ${colors.kpiCardBorder}`,
        borderRadius: "8px",
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.secondaryText,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: colors.bodyText,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CurrencyCard({ label, value, colors }: { label: string; value: string; colors: ReportThemeColors }) {
  return (
    <div
      style={{
        backgroundColor: colors.kpiCardBg,
        border: `1px solid ${colors.kpiCardBorder}`,
        borderRadius: "8px",
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.secondaryText,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: colors.bodyText,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionDivider({ colors }: { colors: ReportThemeColors }) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${colors.divider}`,
        margin: "0",
      }}
    />
  );
}

/* ---------- Company Page Content (rendered inside a page sheet) ---------- */

function CompanyPageContent({
  investment,
  metrics,
  currency,
  colors,
}: {
  investment: InvestmentSnapshot;
  metrics: CompanyMetricsPage | null;
  currency: string;
  colors: ReportThemeColors;
}) {
  const moic = investment.invested > 0
    ? ((investment.current + investment.realized) / investment.invested).toFixed(2) + "x"
    : "-";

  // Metrics cross-tab data
  let metricNames: string[] = [];
  let periodKeys: string[] = [];
  let periodType = "quarterly";
  const valueLookup = new Map<string, string | number>();

  if (metrics && metrics.metrics.length > 0) {
    const metricNameSet = new Set<string>();
    const periodKeySet = new Set<string>();

    for (const m of metrics.metrics) {
      metricNameSet.add(m.metric_name);
      periodKeySet.add(m.period_start);
    }

    if (metrics.metricOrder && metrics.metricOrder.length > 0) {
      const orderSet = new Set(metrics.metricOrder);
      metricNames = [
        ...metrics.metricOrder.filter((n) => metricNameSet.has(n)),
        ...[...metricNameSet].filter((n) => !orderSet.has(n)),
      ];
    } else {
      metricNames = [...metricNameSet];
    }

    periodKeys = [...periodKeySet].sort((a, b) => a.localeCompare(b));
    periodType = metrics.metrics[0].period_type;

    for (const m of metrics.metrics) {
      valueLookup.set(`${m.metric_name}|${m.period_start}`, m.value);
    }
  }

  return (
    <>
      {/* Company header */}
      <div
        style={{
          backgroundColor: colors.headerBg,
          color: colors.headerText,
          padding: "16px 24px",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: 0.7,
            marginBottom: "4px",
          }}
        >
          Company Detail
        </div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: colors.headerText }}>
          {investment.company}
        </div>
      </div>

      <div
        style={{
          padding: "20px 24px",
          border: `1px solid ${colors.tableBorder}`,
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        }}
      >
        {/* Investment KPI row */}
        <div className="grid grid-cols-4 gap-3" style={{ marginBottom: "16px" }}>
          <CurrencyCard label="Invested" value={fmtCurrency(investment.invested, currency)} colors={colors} />
          <CurrencyCard label="Current Value" value={fmtCurrency(investment.current, currency)} colors={colors} />
          <CurrencyCard label="Realized" value={fmtCurrency(investment.realized, currency)} colors={colors} />
          <KPICard label="MOIC" value={moic} colors={colors} />
        </div>

        {/* Metrics table (if available) */}
        {metricNames.length > 0 && (
          <>
            <SectionDivider colors={colors} />

            <div style={{ marginTop: "16px" }}>
              <h3
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: colors.sectionHeading,
                  marginBottom: "10px",
                  margin: "0 0 10px 0",
                }}
              >
                Metrics ({metricNames.length})
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  border: `1px solid ${colors.tableBorder}`,
                  borderRadius: "6px",
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      Metric
                    </th>
                    {periodKeys.map((pk) => (
                      <th
                        key={pk}
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: colors.secondaryText,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPeriodLabel(pk, periodType)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricNames.map((name, idx) => (
                    <tr
                      key={name}
                      style={{
                        backgroundColor: idx % 2 === 1 ? colors.tableAltRow : colors.pageBg,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          fontWeight: 500,
                          color: colors.bodyText,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </td>
                      {periodKeys.map((pk) => {
                        const val = valueLookup.get(`${name}|${pk}`);
                        return (
                          <td
                            key={pk}
                            style={{
                              padding: "8px 10px",
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 600,
                              color: val != null ? colors.bodyText : colors.secondaryText,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {val != null ? formatMetricValue(val, name) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ---------- Page footer ---------- */

function PageFooter({ colors }: { colors: ReportThemeColors }) {
  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: "16px",
        borderTop: `1px solid ${colors.divider}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          color: colors.secondaryText,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Confidential
      </span>
      <span style={{ fontSize: "10px", color: colors.secondaryText }}>
        Generated{" "}
        {new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

/* ---------- Main component ---------- */

/* ---------- Shared page sheet style ---------- */

const PAGE_GAP = 16; // px between visual pages

function pageSheetStyle(colors: ReportThemeColors, isFirst: boolean): React.CSSProperties {
  return {
    backgroundColor: colors.pageBg,
    borderRadius: "8px",
    marginTop: isFirst ? 0 : PAGE_GAP,
    // Visible shadow to separate pages visually in the preview
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
    overflow: "hidden",
  };
}

/* ---------- Main component ---------- */

export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(
  function ReportPreview(
    {
      fundName,
      title,
      reportDate,
      reportType,
      currency,
      performance,
      investments,
      quarterlySummary,
      theme,
      companyMetrics,
    },
    ref,
  ) {
    const colors = theme ?? getReportTheme().colors;
    const totalInvested = investments.reduce((sum, inv) => sum + inv.invested, 0);
    const totalCurrent = investments.reduce((sum, inv) => sum + inv.current, 0);
    const totalRealized = investments.reduce((sum, inv) => sum + inv.realized, 0);
    const totalMOIC = totalInvested > 0 ? ((totalCurrent + totalRealized) / totalInvested).toFixed(2) + "x" : "-";

    const reportTypeBadge = reportType.replace("_", " ");

    return (
      <div
        ref={ref}
        style={{
          color: colors.bodyText,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "14px",
          lineHeight: "1.5",
          // Neutral background behind page sheets
          backgroundColor: "#27272a",
          padding: `${PAGE_GAP}px`,
        }}
      >
        {/* ===== PAGE 1: Fund Summary ===== */}
        <div data-pdf-page style={pageSheetStyle(colors, true)}>
          {/* Navy Header Bar */}
          <div
            style={{
              backgroundColor: colors.headerBg,
              color: colors.headerText,
              padding: "28px 32px",
              borderRadius: "8px 8px 0 0",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.7,
                marginBottom: "6px",
              }}
            >
              {fundName}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: 1.3,
                    color: colors.headerText,
                  }}
                >
                  {title}
                </h1>
                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "6px",
                    opacity: 0.8,
                    color: colors.headerText,
                  }}
                >
                  {fmtDate(reportDate)}
                </div>
              </div>
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: colors.badgeBg,
                  color: colors.headerText,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                  marginTop: "4px",
                }}
              >
                {reportTypeBadge}
              </span>
            </div>
          </div>

          {/* Summary content */}
          <div style={{ padding: "28px 32px" }}>
            {/* Performance Summary Section */}
            <div style={{ marginBottom: "28px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: colors.sectionHeading,
                  marginBottom: "14px",
                  margin: "0 0 14px 0",
                }}
              >
                Performance Summary
              </h2>

              <div
                className="grid grid-cols-5 gap-3"
                style={{ marginBottom: "12px" }}
              >
                <KPICard label="TVPI" value={fmtMultiple(performance.tvpi)} colors={colors} />
                <KPICard label="DPI" value={fmtMultiple(performance.dpi)} colors={colors} />
                <KPICard label="RVPI" value={fmtMultiple(performance.rvpi)} colors={colors} />
                <KPICard label="IRR" value={fmtPercent(performance.irr)} colors={colors} />
                <KPICard label="MOIC" value={fmtMultiple(performance.moic)} colors={colors} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <CurrencyCard
                  label="Total Invested"
                  value={fmtCurrency(performance.totalInvested, currency)}
                  colors={colors}
                />
                <CurrencyCard
                  label="Current Value"
                  value={fmtCurrency(performance.totalCurrentValue, currency)}
                  colors={colors}
                />
                <CurrencyCard
                  label="Total Value"
                  value={fmtCurrency(
                    performance.totalCurrentValue + performance.totalRealizedValue,
                    currency,
                  )}
                  colors={colors}
                />
              </div>
            </div>

            <SectionDivider colors={colors} />

            {/* Quarterly Summary */}
            {quarterlySummary && quarterlySummary !== "<p></p>" && (
              <>
                <div style={{ margin: "24px 0" }}>
                  <h2
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: colors.sectionHeading,
                      marginBottom: "12px",
                      margin: "0 0 12px 0",
                    }}
                  >
                    Quarterly Summary
                  </h2>
                  <div
                    style={{
                      color: colors.bodyText,
                      fontSize: "13px",
                      lineHeight: "1.7",
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(quarterlySummary) }}
                  />
                </div>
                <SectionDivider colors={colors} />
              </>
            )}

            {/* Portfolio Overview Table */}
            {investments.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <h2
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: colors.sectionHeading,
                    marginBottom: "14px",
                    margin: "0 0 14px 0",
                  }}
                >
                  Portfolio Overview ({investments.length}{" "}
                  {investments.length === 1 ? "Company" : "Companies"})
                </h2>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    border: `1px solid ${colors.tableBorder}`,
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                      {["Company", "Invested", "Current Value", "Realized", "MOIC"].map(
                        (label, i) => (
                          <th
                            key={label}
                            style={{
                              padding: "10px 14px",
                              textAlign: i === 0 ? "left" : "right",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: colors.secondaryText,
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                              borderBottom: `1px solid ${colors.tableBorder}`,
                            }}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        style={{
                          backgroundColor:
                            idx % 2 === 1 ? colors.tableAltRow : colors.pageBg,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        <td style={{ padding: "10px 14px", fontWeight: 500, color: colors.bodyText }}>{inv.company}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: colors.secondaryText }}>{fmtCurrency(inv.invested, currency)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: colors.secondaryText }}>{fmtCurrency(inv.current, currency)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: colors.secondaryText }}>{fmtCurrency(inv.realized, currency)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: colors.bodyText }}>{fmtMOIC(inv.invested, inv.current, inv.realized)}</td>
                      </tr>
                    ))}
                    <tr
                      style={{
                        backgroundColor: colors.tableHeaderBg,
                        borderTop: `2px solid ${colors.tableBorder}`,
                      }}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: colors.bodyText, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em" }}>Totals</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: colors.bodyText }}>{fmtCurrency(totalInvested, currency)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: colors.bodyText }}>{fmtCurrency(totalCurrent, currency)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: colors.bodyText }}>{fmtCurrency(totalRealized, currency)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: colors.bodyText }}>{totalMOIC}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <PageFooter colors={colors} />
          </div>
        </div>

        {/* ===== PER-COMPANY PAGES ===== */}
        {investments.map((inv) => {
          const metrics = companyMetrics?.[inv.id];
          return (
            <div key={inv.id} data-pdf-page style={pageSheetStyle(colors, false)}>
              <CompanyPageContent
                investment={inv}
                metrics={metrics ?? null}
                currency={currency}
                colors={colors}
              />
              <div style={{ padding: "0 24px 20px" }}>
                <PageFooter colors={colors} />
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
