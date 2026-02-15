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

const linePath = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");

const areaPath = `${linePath} L${points[points.length - 1].x},${PADDING.top + chartH} L${points[0].x},${PADDING.top + chartH} Z`;

const gridLines = [8, 9, 10, 11, 12, 13];

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
