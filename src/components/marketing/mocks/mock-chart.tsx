"use client";

import { motion } from "framer-motion";
import { MOCK_CHART_DATA } from "./mock-data";

const WIDTH = 560;
const HEIGHT = 192;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

const chartW = WIDTH - PADDING.left - PADDING.right;
const chartH = HEIGHT - PADDING.top - PADDING.bottom;

const minVal = Math.min(...MOCK_CHART_DATA.map((d) => d.value)) - 0.5;
const maxVal = Math.max(...MOCK_CHART_DATA.map((d) => d.value)) + 0.5;

function scaleX(i: number) {
  return PADDING.left + (i / (MOCK_CHART_DATA.length - 1)) * chartW;
}

function scaleY(v: number) {
  return PADDING.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
}

const points = MOCK_CHART_DATA.map((d, i) => ({ x: scaleX(i), y: scaleY(d.value) }));

// Build a smooth cubic bezier curve through all points
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    // Catmull-Rom to cubic bezier control points (tension = 0.35)
    const tension = 0.35;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const linePath = buildSmoothPath(points);

const areaPath = `${linePath} L${points[points.length - 1].x},${PADDING.top + chartH} L${points[0].x},${PADDING.top + chartH} Z`;

const gridLines = [8, 9, 10, 11, 12, 13];

const lastPoint = points[points.length - 1];
const lastValue = MOCK_CHART_DATA[MOCK_CHART_DATA.length - 1].value;

export function MockChart() {
  return (
    <div aria-hidden="true" className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="mock-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridLines.map((v) => (
          <line
            key={v}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={scaleY(v)}
            y2={scaleY(v)}
            stroke="var(--chart-grid)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis tick labels */}
        {gridLines
          .filter((_, i) => i % 2 === 0)
          .map((v) => (
            <text
              key={v}
              x={PADDING.left - 8}
              y={scaleY(v) + 4}
              textAnchor="end"
              className="fill-[var(--text-muted)] text-[10px]"
            >
              ${v}M
            </text>
          ))}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#mock-area-gradient)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--accent)"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
          />
        ))}

        {/* Value annotation on last data point */}
        <motion.g
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1.4 }}
        >
          <rect
            x={lastPoint.x - 24}
            y={lastPoint.y - 22}
            width={48}
            height={16}
            rx={4}
            fill="var(--accent)"
          />
          {/* Tooltip arrow */}
          <polygon
            points={`${lastPoint.x - 3},${lastPoint.y - 6} ${lastPoint.x + 3},${lastPoint.y - 6} ${lastPoint.x},${lastPoint.y - 2}`}
            fill="var(--accent)"
          />
          <text
            x={lastPoint.x}
            y={lastPoint.y - 11}
            textAnchor="middle"
            className="text-[9px] font-semibold"
            fill="white"
          >
            ${lastValue}M
          </text>
        </motion.g>

        {/* X-axis labels */}
        {MOCK_CHART_DATA.map((d, i) => (
          <text
            key={d.month}
            x={scaleX(i)}
            y={HEIGHT - 4}
            textAnchor="middle"
            className="fill-[var(--text-muted)] text-[10px]"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  );
}
