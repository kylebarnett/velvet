"use client";

import { motion, useReducedMotion } from "framer-motion";

const DATA = [
  { label: "Q1", value: 1.2 },
  { label: "Q2", value: 1.8 },
  { label: "Q3", value: 1.5 },
  { label: "Q4", value: 2.4 },
  { label: "Q1", value: 2.9 },
];

const W = 280;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 20, left: 32 };
const chartW = W - PAD.left - PAD.right;
const chartH = H - PAD.top - PAD.bottom;

const minV = Math.min(...DATA.map((d) => d.value)) - 0.3;
const maxV = Math.max(...DATA.map((d) => d.value)) + 0.3;

function sx(i: number) {
  return PAD.left + (i / (DATA.length - 1)) * chartW;
}
function sy(v: number) {
  return PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;
}

const pts = DATA.map((d, i) => ({ x: sx(i), y: sy(d.value) }));
const linePath = pts
  .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
  .join(" ");
const areaPath = `${linePath} L${pts[pts.length - 1].x},${PAD.top + chartH} L${pts[0].x},${PAD.top + chartH} Z`;
const gridVals = [1, 1.5, 2, 2.5, 3];

export function ChartBuildScene() {
  const prefersReducedMotion = useReducedMotion();
  const dur = prefersReducedMotion ? 0 : undefined;

  return (
    <div className="p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="help-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridVals.map((v) => (
          <motion.line
            key={v}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={sy(v)}
            y2={sy(v)}
            stroke="var(--chart-grid)"
            strokeWidth={1}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: dur ?? 0.4, delay: dur === 0 ? 0 : 0.1 }}
          />
        ))}

        {/* Y labels */}
        {gridVals
          .filter((_, i) => i % 2 === 0)
          .map((v) => (
            <text
              key={v}
              x={PAD.left - 6}
              y={sy(v) + 3}
              textAnchor="end"
              className="fill-[var(--text-muted)] text-[8px]"
            >
              ${v}M
            </text>
          ))}

        {/* Area */}
        <motion.path
          d={areaPath}
          fill="url(#help-area-grad)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: dur ?? 0.6, delay: dur === 0 ? 0 : 0.5 }}
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
          transition={{
            duration: dur ?? 1,
            ease: "easeInOut",
            delay: dur === 0 ? 0 : 0.3,
          }}
        />

        {/* Dots */}
        {pts.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--accent)"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: dur ?? 0.25,
              delay: dur === 0 ? 0 : 0.6 + i * 0.12,
            }}
          />
        ))}

        {/* X labels */}
        {DATA.map((d, i) => (
          <text
            key={i}
            x={sx(i)}
            y={H - 4}
            textAnchor="middle"
            className="fill-[var(--text-muted)] text-[8px]"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
