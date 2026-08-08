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
}: {
  points: number[];
  labels?: string[];
  height?: number;
  color?: string;
  unit?: string;
  showDots?: boolean;
}) {
  const W = 320;
  const H = height;
  const padL = 6;
  const padR = 30;
  const padT = 16;
  const padB = labels ? 22 : 8;
  const gid = React.useId().replace(/[:]/g, "");

  if (points.length === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const x = (i: number) =>
    padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1));
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#a${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 4.2 : 2.6} fill={color} stroke="var(--bg)" strokeWidth={i === points.length - 1 ? 2 : 0} />
        ))}
      <text x={x(points.length - 1) + 7} y={y(last) + 4} fontSize="11" fontWeight="700" fill="var(--ink)" className="tabular">
        {Math.round(last * 10) / 10}
        {unit}
      </text>
      {labels &&
        labels.map((l, i) =>
          l ? (
            <text key={i} x={x(i)} y={H - 6} fontSize="9.5" fill="var(--ink-3)" textAnchor="middle">
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
  const padB = labels ? 20 : 4;
  const max = Math.max(...values, 1);
  const bw = Math.min(30, (W - 20) / values.length - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {values.map((v, i) => {
        const x = 10 + (i * (W - 20)) / values.length + ((W - 20) / values.length - bw) / 2;
        const h = Math.max(3, (v / max) * (H - padB - 14));
        const y = H - padB - h;
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
