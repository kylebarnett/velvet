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
          backgroundColor: colors.pageBg,
          color: colors.bodyText,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
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

        {/* Content body */}
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

            {/* KPI cards - 5 column grid */}
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

            {/* Currency totals - 3 column grid */}
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

          {/* Investments Table */}
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
                Portfolio Investments ({investments.length})
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
                  <tr
                    style={{
                      backgroundColor: colors.tableHeaderBg,
                    }}
                  >
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      Company
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      Invested
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      Current Value
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      Realized
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.secondaryText,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      MOIC
                    </th>
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
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 500,
                          color: colors.bodyText,
                        }}
                      >
                        {inv.company}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: colors.secondaryText,
                        }}
                      >
                        {fmtCurrency(inv.invested, currency)}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: colors.secondaryText,
                        }}
                      >
                        {fmtCurrency(inv.current, currency)}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: colors.secondaryText,
                        }}
                      >
                        {fmtCurrency(inv.realized, currency)}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: colors.bodyText,
                        }}
                      >
                        {fmtMOIC(inv.invested, inv.current, inv.realized)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr
                    style={{
                      backgroundColor: colors.tableHeaderBg,
                      borderTop: `2px solid ${colors.tableBorder}`,
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: colors.bodyText,
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Totals
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: colors.bodyText,
                      }}
                    >
                      {fmtCurrency(totalInvested, currency)}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: colors.bodyText,
                      }}
                    >
                      {fmtCurrency(totalCurrent, currency)}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: colors.bodyText,
                      }}
                    >
                      {fmtCurrency(totalRealized, currency)}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: colors.bodyText,
                      }}
                    >
                      {totalMOIC}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "32px",
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
            <span
              style={{
                fontSize: "10px",
                color: colors.secondaryText,
              }}
            >
              Generated {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  },
);
