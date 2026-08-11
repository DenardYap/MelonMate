"use client";

import React from "react";

/** Simple responsive SVG line chart with gradient area fill. */
export function LineChart({
  points,
  labels,
  height = 150,
  color = "var(--melon-500)",
  unit = "",
  showDots = true,
  showLastValue = true,
  accessibleLabel,
}: {
  points: number[];
  labels?: string[];
  height?: number;
  color?: string;
  unit?: string;
  showDots?: boolean;
  showLastValue?: boolean;
  accessibleLabel?: string;
}) {
  const W = 320;
  const H = height;
  const padL = 10;
  const padR = showLastValue ? 48 : 10;
  const padT = 16;
  const padB = labels ? 22 : 8;
  const plotRight = W - padR;
  const plotBottom = H - padB;
  const gid = React.useId().replace(/[:]/g, "");

  if (points.length === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || Math.max(Math.abs(max) * 0.06, 1);
  const lo = min - span * (points.length <= 2 ? 0.35 : 0.15);
  const hi = max + span * (points.length <= 2 ? 0.35 : 0.15);

  const x = (i: number) =>
    padL + (points.length === 1 ? (plotRight - padL) / 2 : (i * (plotRight - padL)) / (points.length - 1));
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (plotBottom - padT);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${plotBottom} L${x(0).toFixed(1)},${plotBottom} Z`;
  const last = points[points.length - 1];
  const gridRows = [0, 0.5, 1].map((fraction) => padT + fraction * (plotBottom - padT));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role={accessibleLabel ? "img" : undefined}
      aria-label={accessibleLabel}
      aria-hidden={accessibleLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={padL} y={padT} width={plotRight - padL} height={plotBottom - padT} rx="9" fill="var(--track)" opacity="0.32" />
      {gridRows.map((rowY, index) => (
        <line
          key={index}
          x1={padL}
          x2={plotRight}
          y1={rowY}
          y2={rowY}
          stroke="var(--ink-3)"
          strokeWidth={index === gridRows.length - 1 ? 1.1 : 0.8}
          strokeDasharray={index === gridRows.length - 1 ? undefined : "3 5"}
          opacity={index === gridRows.length - 1 ? 0.3 : 0.2}
        />
      ))}
      {points.length === 1 ? (
        <line
          x1={padL}
          x2={plotRight}
          y1={y(last)}
          y2={y(last)}
          stroke={color}
          strokeWidth="2"
          strokeDasharray="5 6"
          strokeLinecap="round"
          opacity="0.55"
        />
      ) : (
        <>
          <path d={area} fill={`url(#a${gid})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 4.8 : 3.2} fill={color} stroke="var(--bg)" strokeWidth="2" />
        ))}
      {showLastValue && (
        <text x={x(points.length - 1) + 7} y={y(last) + 4} fontSize="11" fontWeight="700" fill="var(--ink)" className="tabular">
          {Math.round(last * 10) / 10}
          {unit}
        </text>
      )}
      {labels &&
        labels.map((l, i) =>
          l ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              fontSize="9.5"
              fill="var(--ink-3)"
              textAnchor={points.length > 1 && i === 0 ? "start" : points.length > 1 && i === points.length - 1 ? "end" : "middle"}
            >
              {l}
            </text>
          ) : null
        )}
    </svg>
  );
}

/** Vertical mini bar chart. */
export function BarChart({
  values,
  labels,
  height = 130,
  color = "var(--canta-400)",
  highlight = -1,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  highlight?: number;
}) {
  const W = 320;
  const H = height;
  const padT = 14;
  const padB = labels ? 20 : 4;
  const plotBottom = H - padB;
  const max = Math.max(...values, 1);
  const slotWidth = values.length ? (W - 20) / values.length : W - 20;
  const bw = values.length === 1 ? 72 : values.length === 2 ? 54 : Math.min(30, slotWidth - 8);
  const gridRows = [0, 0.5, 1].map((fraction) => padT + fraction * (plotBottom - padT));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x="10" y={padT} width={W - 20} height={plotBottom - padT} rx="9" fill="var(--track)" opacity="0.32" />
      {gridRows.map((rowY, index) => (
        <line
          key={index}
          x1="10"
          x2={W - 10}
          y1={rowY}
          y2={rowY}
          stroke="var(--ink-3)"
          strokeWidth={index === gridRows.length - 1 ? 1.1 : 0.8}
          strokeDasharray={index === gridRows.length - 1 ? undefined : "3 5"}
          opacity={index === gridRows.length - 1 ? 0.3 : 0.2}
        />
      ))}
      {values.map((v, i) => {
        const x = 10 + i * slotWidth + (slotWidth - bw) / 2;
        const h = Math.max(3, (v / max) * (plotBottom - padT - 10));
        const y = plotBottom - h;
        const on = i === highlight;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx={Math.min(7, bw / 2)} fill={on ? "var(--melon-500)" : color} opacity={on ? 1 : 0.55} />
            {v > 0 && (
              <text x={x + bw / 2} y={y - 4} fontSize="9" fontWeight="700" textAnchor="middle" fill="var(--ink-2)" className="tabular">
                {v >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v)}
              </text>
            )}
            {labels && (
              <text x={x + bw / 2} y={H - 6} fontSize="9.5" textAnchor="middle" fill={on ? "var(--ink)" : "var(--ink-3)"} fontWeight={on ? 700 : 400}>
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
