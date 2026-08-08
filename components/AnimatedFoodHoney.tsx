"use client";

import type { ReactNode } from "react";
import type { ThemeId } from "@/lib/types";

export const HONEY_POSES = ["wave", "peek", "record", "apple", "nap", "chef"] as const;
export type HoneyPose = (typeof HONEY_POSES)[number];

interface HoneyPalette {
  from: string;
  to: string;
  outline: string;
  ink: string;
  highlight: string;
  blush: string;
  leaf: string;
  detail: string;
}

export const HONEY_THEME_PALETTES: Record<ThemeId, HoneyPalette> = {
  honeydew: { from: "#F2F9C5", to: "#D9EDA0", outline: "#4F6842", ink: "#35452F", highlight: "#FFFFFF", blush: "#F4B7A2", leaf: "#8EAE4F", detail: "#B7D874" },
  watermelon: { from: "#FFB6B2", to: "#EF6972", outline: "#285C43", ink: "#26382D", highlight: "#FFF8F5", blush: "#FFD0C7", leaf: "#3F8C63", detail: "#FBE7D8" },
  cantaloupe: { from: "#FFD49F", to: "#EF9B55", outline: "#824727", ink: "#463528", highlight: "#FFF8E9", blush: "#F6B7A0", leaf: "#8FAA65", detail: "#FFE5C5" },
  canary: { from: "#FFF4A8", to: "#E9C43F", outline: "#80651E", ink: "#3D3A22", highlight: "#FFFDF0", blush: "#F1B79B", leaf: "#89A94A", detail: "#FFF8C9" },
  hami: { from: "#E8F0D7", to: "#AFC99A", outline: "#465D3B", ink: "#303B2D", highlight: "#FFFFFF", blush: "#DDAF98", leaf: "#8EAE79", detail: "#D8BF82" },
  chamoe: { from: "#FFE77A", to: "#E8AA2F", outline: "#825A1B", ink: "#413718", highlight: "#FFFDF1", blush: "#EFAE91", leaf: "#83A251", detail: "#FFF9DC" },
  "moon-gold": { from: "#F0E5B9", to: "#C69B34", outline: "#596080", ink: "#333444", highlight: "#FFFDF4", blush: "#CE8C83", leaf: "#78809D", detail: "#F6EBC3" },
  densuke: { from: "#53685D", to: "#263A31", outline: "#17241E", ink: "#F4F2E8", highlight: "#FFFFFF", blush: "#A84747", leaf: "#A84747", detail: "#91A598" },
};

export function isHoneyPose(value: string | null | undefined): value is HoneyPose {
  return HONEY_POSES.includes(value as HoneyPose);
}

export function isHoneyTheme(value: string | null | undefined): value is ThemeId {
  return Boolean(value && value in HONEY_THEME_PALETTES);
}

export function AnimatedFoodHoney({ theme, forcedPose }: { theme: ThemeId; forcedPose?: HoneyPose }) {
  const pose = forcedPose ?? "peek";

  const palette = HONEY_THEME_PALETTES[theme];
  const id = `food-honey-${theme}-${pose}`;

  return (
    <div className={`log-food-honey honey-pose-${pose}`} data-pose={pose} data-theme-variant={theme} aria-hidden="true">
      <svg className="food-honey-svg" viewBox="0 0 240 160" focusable="false">
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={palette.from} />
            <stop offset="1" stopColor={palette.to} />
          </linearGradient>
          <clipPath id={`${id}-upright-clip`}>
            <ellipse cx="120" cy="94" rx="52" ry="55" />
          </clipPath>
          <clipPath id={`${id}-nap-clip`}>
            <ellipse cx="119" cy="121" rx="76" ry="34" />
          </clipPath>
        </defs>
        {pose === "wave" && <WavePose id={id} theme={theme} palette={palette} />}
        {pose === "peek" && <PeekPose id={id} theme={theme} palette={palette} />}
        {pose === "record" && <RecordPose id={id} theme={theme} palette={palette} />}
        {pose === "apple" && <ApplePose id={id} theme={theme} palette={palette} />}
        {pose === "nap" && <NapPose id={id} theme={theme} palette={palette} />}
        {pose === "chef" && <ChefPose id={id} theme={theme} palette={palette} />}
      </svg>
    </div>
  );
}

function WavePose({ id, theme, palette }: PoseProps) {
  return (
    <>
      <g transform="translate(0 24)">
        <UprightHoney
          id={id}
          theme={theme}
          palette={palette}
          hideFeet
          back={(
            <g className="honey-wave-arm">
              <path d="M157 89c17-1 28-15 30-34" fill="none" stroke={palette.outline} strokeWidth="17" strokeLinecap="round" />
              <path d="M157 89c17-1 28-15 30-34" fill="none" stroke={`url(#${id}-body)`} strokeWidth="9" strokeLinecap="round" />
              <ellipse cx="189" cy="49" rx="9" ry="11" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" transform="rotate(-14 189 49)" />
            </g>
          )}
        />
        <g className="honey-wave-marks" fill="none" stroke={palette.outline} strokeWidth="3" strokeLinecap="round">
          <path d="M211 37l9-6" />
          <path d="M214 48l12-1" />
          <path d="M207 27l3-7" />
        </g>
      </g>
      <g className="honey-cling-hand">
        <path d="M86 139c-8 1-12 7-9 14" fill="none" stroke={palette.outline} strokeWidth="15" strokeLinecap="round" />
        <path d="M86 139c-8 1-12 7-9 14" fill="none" stroke={`url(#${id}-body)`} strokeWidth="8" strokeLinecap="round" />
      </g>
    </>
  );
}

function PeekPose({ id, theme, palette }: PoseProps) {
  return (
    <g className="honey-peek-group">
      <ellipse cx="120" cy="151" rx="51" ry="54" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="6" />
      <ThemeMark theme={theme} palette={palette} compact />
      <path d="M118 100c-1-13 2-21 10-29" fill="none" stroke={palette.outline} strokeWidth="7" strokeLinecap="round" />
      <path d="M128 80c15-11 29-8 38 0-10 13-24 16-37 7z" fill={palette.leaf} stroke={palette.outline} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="103" cy="129" r="5" fill={palette.ink} />
      <circle cx="137" cy="129" r="5" fill={palette.ink} />
      <circle cx="101.5" cy="127.5" r="1.4" fill={palette.highlight} opacity=".75" />
      <circle cx="135.5" cy="127.5" r="1.4" fill={palette.highlight} opacity=".75" />
      <path d="M111 140c6 6 12 6 18 0" fill="none" stroke={palette.ink} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="92" cy="151" rx="11" ry="7" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
      <ellipse cx="148" cy="151" rx="11" ry="7" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
      <g className="honey-peek-lines" fill="none" stroke={palette.outline} strokeWidth="2.5" strokeLinecap="round">
        <path d="M68 118l-9-5" /><path d="M171 118l9-5" />
      </g>
    </g>
  );
}

function RecordPose({ id, theme, palette }: PoseProps) {
  return (
    <UprightHoney
      id={id}
      theme={theme}
      palette={palette}
      glasses
      back={(
        <>
          <path d="M82 113c-7 10 4 23 31 27" fill="none" stroke={palette.outline} strokeWidth="15" strokeLinecap="round" />
          <path d="M82 113c-7 10 4 23 31 27" fill="none" stroke={`url(#${id}-body)`} strokeWidth="8" strokeLinecap="round" />
          <path d="M158 113c10 7 13 17 7 28" fill="none" stroke={palette.outline} strokeWidth="15" strokeLinecap="round" />
          <path d="M158 113c10 7 13 17 7 28" fill="none" stroke={`url(#${id}-body)`} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      front={(
        <g className="honey-record-board">
          <g transform="rotate(2 139 134)">
            <rect x="108" y="113" width="62" height="41" rx="7" fill="#FFFDF4" stroke={palette.outline} strokeWidth="4" />
            <rect x="129" y="108" width="20" height="8" rx="4" fill={palette.detail} stroke={palette.outline} strokeWidth="3" />
            <text x="117" y="128" fill={palette.ink} fontSize="8" fontWeight="800">cal</text>
            <path d="M117 134h42M117 141h34M117 148h40" stroke={palette.outline} strokeWidth="2.5" strokeLinecap="round" opacity=".62" />
            <circle className="honey-record-dot" cx="162" cy="123" r="3.5" fill="#E8544A" />
          </g>
          <ellipse cx="165" cy="140" rx="7" ry="6" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
          <ellipse cx="113" cy="140" rx="7" ry="6" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
          <g className="honey-record-pen">
            <path d="M115 139l29-12" stroke={palette.outline} strokeWidth="8" strokeLinecap="round" />
            <path d="M115 139l29-12" stroke="#F2B94A" strokeWidth="4" strokeLinecap="round" />
            <path d="M144 127l5-3-2 6z" fill={palette.ink} />
          </g>
        </g>
      )}
    />
  );
}

function ApplePose({ id, theme, palette }: PoseProps) {
  return (
    <UprightHoney
      id={id}
      theme={theme}
      palette={palette}
      face="closed-chew"
      back={(
        <>
          <path d="M82 111c-11 8-7 23 8 29" fill="none" stroke={palette.outline} strokeWidth="16" strokeLinecap="round" />
          <path d="M82 111c-11 8-7 23 8 29" fill="none" stroke={`url(#${id}-body)`} strokeWidth="9" strokeLinecap="round" />
          <path d="M158 111c11 8 7 23-8 29" fill="none" stroke={palette.outline} strokeWidth="16" strokeLinecap="round" />
          <path d="M158 111c11 8 7 23-8 29" fill="none" stroke={`url(#${id}-body)`} strokeWidth="9" strokeLinecap="round" />
        </>
      )}
      front={(
        <>
          <g className="honey-apple" transform="translate(0 6)">
            <path d="M120 112c-8-7-20-1-18 10 1 12 10 21 18 23 8-2 17-11 18-23 2-11-10-17-18-10z" fill="#E85E55" stroke={palette.outline} strokeWidth="4" />
            <path d="M120 111c0-7 3-11 7-14" fill="none" stroke={palette.outline} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M126 101c7-5 13-3 17 1-5 6-11 7-17 4z" fill={palette.leaf} stroke={palette.outline} strokeWidth="2.5" />
            <path d="M108 112c3-5 7-7 11-5-2 6-5 9-10 10z" fill="#FFFDF4" />
          </g>
          <circle cx="98" cy="141" r="7" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
          <circle cx="142" cy="141" r="7" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" />
          <g className="honey-crumbs" fill="#E1A643" stroke={palette.outline} strokeWidth="1">
            <circle cx="130" cy="103" r="1.6" /><circle cx="134" cy="107" r="1.25" /><circle cx="131" cy="110" r="1" />
          </g>
          <g className="honey-chew-lines" fill="none" stroke={palette.outline} strokeWidth="2.5" strokeLinecap="round">
            <path d="M91 98l-7-4M90 104l-8 1" />
            <path d="M149 98l7-4M150 104l8 1" />
          </g>
        </>
      )}
    />
  );
}

function NapPose({ id, theme, palette }: PoseProps) {
  return (
    <>
      <g className="honey-nap-body">
        <ellipse cx="119" cy="121" rx="76" ry="34" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="6" />
        <g clipPath={`url(#${id}-nap-clip)`}><ThemeMark theme={theme} palette={palette} nap /></g>
        <ellipse cx="55" cy="143" rx="22" ry="10" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="5" />
        <path d="M179 102c6-10 7-20 4-30" fill="none" stroke={palette.outline} strokeWidth="6" strokeLinecap="round" />
        <path d="M181 79c12-9 24-6 31 1-8 10-19 12-30 6z" fill={palette.leaf} stroke={palette.outline} strokeWidth="4" />
        <path d="M161 116c7 5 13 5 19 0" fill="none" stroke={palette.ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M184 126c3 2 5 2 7 0" fill="none" stroke={palette.ink} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="107" cy="117" rx="12" ry="8" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" transform="rotate(10 107 117)" />
        <ellipse cx="132" cy="117" rx="12" ry="8" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="4" transform="rotate(-10 132 117)" />
        <path d="M104 136c13 5 26 5 39 0" fill="none" stroke={palette.outline} strokeWidth="3" strokeLinecap="round" opacity=".45" />
      </g>
      <g className="honey-sleep-z" fill={palette.outline} fontWeight="900">
        <text x="194" y="66" fontSize="11">Z</text>
        <text x="207" y="51" fontSize="14">Z</text>
        <text x="221" y="32" fontSize="17">Z</text>
      </g>
    </>
  );
}

function ChefPose({ id, theme, palette }: PoseProps) {
  return (
    <UprightHoney
      id={id}
      theme={theme}
      palette={palette}
      back={(
        <>
          <path d="M84 113c-11 8-9 21 2 29" fill="none" stroke={palette.outline} strokeWidth="15" strokeLinecap="round" />
          <path d="M84 113c-11 8-9 21 2 29" fill="none" stroke={`url(#${id}-body)`} strokeWidth="8" strokeLinecap="round" />
          <path d="M156 113c11 8 9 21-2 29" fill="none" stroke={palette.outline} strokeWidth="15" strokeLinecap="round" />
          <path d="M156 113c11 8 9 21-2 29" fill="none" stroke={`url(#${id}-body)`} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      front={(
        <>
          <g className="honey-chef-hat">
            <path d="M92 45c-8-5-7-17 2-20 3-11 17-13 23-5 7-9 22-6 24 5 11 2 13 15 5 21l-5 10H98z" fill="#FFFDF5" stroke={palette.outline} strokeWidth="4" strokeLinejoin="round" />
            <path d="M99 48h42v11H99z" fill="#FFFDF5" stroke={palette.outline} strokeWidth="4" />
          </g>
          <path d="M79 126h82l-8 23H87z" fill={palette.detail} stroke={palette.outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M88 126c15 8 48 8 64 0" fill="none" stroke={palette.outline} strokeWidth="4" />
          <g className="honey-chef-spoon">
            <path d="M145 128l17-29" stroke={palette.outline} strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="165" cy="94" rx="6" ry="8" fill={palette.detail} stroke={palette.outline} strokeWidth="3" transform="rotate(28 165 94)" />
          </g>
          <g className="honey-chef-steam" fill="none" stroke={palette.outline} strokeWidth="2.25" strokeLinecap="round">
            <path d="M102 120c-5-6 5-8 0-14" /><path d="M140 120c-5-6 5-8 0-14" />
          </g>
        </>
      )}
    />
  );
}

function UprightHoney({ id, theme, palette, back, front, glasses = false, hideFeet = false, face = "smile" }: PoseProps & { back?: ReactNode; front?: ReactNode; glasses?: boolean; hideFeet?: boolean; face?: "smile" | "closed-chew" }) {
  return (
    <g className={`honey-upright honey-face-${face}`}>
      {!hideFeet && (
        <>
          <ellipse cx="101" cy="147" rx="22" ry="10" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="5" />
          <ellipse cx="139" cy="147" rx="22" ry="10" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="5" />
        </>
      )}
      {back}
      <ellipse cx="120" cy="94" rx="52" ry="55" fill={`url(#${id}-body)`} stroke={palette.outline} strokeWidth="6" />
      <g clipPath={`url(#${id}-upright-clip)`}><ThemeMark theme={theme} palette={palette} /></g>
      <path d="M118 42c-1-13 2-22 10-30" fill="none" stroke={palette.outline} strokeWidth="7" strokeLinecap="round" />
      <path d="M129 22c15-12 31-9 41 0-10 14-25 17-40 8z" fill={palette.leaf} stroke={palette.outline} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="103" cy="87" r="5.5" fill={palette.ink} />
      <circle cx="137" cy="87" r="5.5" fill={palette.ink} />
      <circle cx="101.4" cy="85.4" r="1.5" fill={palette.highlight} opacity=".76" />
      <circle cx="135.4" cy="85.4" r="1.5" fill={palette.highlight} opacity=".76" />
      <ellipse cx="91" cy="105" rx="8" ry="4" fill={palette.blush} opacity=".62" />
      <ellipse cx="149" cy="105" rx="8" ry="4" fill={palette.blush} opacity=".62" />
      {face === "smile"
        ? <path d="M108 106c8 9 16 9 24 0" fill="none" stroke={palette.ink} strokeWidth="5" strokeLinecap="round" />
        : <path d="M113 106c4 3 10 3 14 0" fill="none" stroke={palette.ink} strokeWidth="4" strokeLinecap="round" />}
      {glasses && (
        <g className="honey-glasses" fill="none" stroke={palette.outline} strokeWidth="3.5">
          <circle cx="103" cy="87" r="12" /><circle cx="137" cy="87" r="12" /><path d="M115 87h10M91 84l-8-4M149 84l8-4" />
        </g>
      )}
      {front}
    </g>
  );
}

function ThemeMark({ theme, palette, compact = false, nap = false }: { theme: ThemeId; palette: HoneyPalette; compact?: boolean; nap?: boolean }) {
  const opacity = theme === "densuke" ? 0.42 : 0.18;
  const shiftY = compact ? 44 : nap ? 27 : 0;
  if (theme === "honeydew") return null;
  if (theme === "watermelon") {
    return (
      <g fill={palette.ink} opacity={opacity} transform={`translate(0 ${shiftY})`}>
        <path d="M88 61c6 4 7 10 2 15-6-4-7-10-2-15z" /><path d="M153 60c6 4 7 10 2 15-6-4-7-10-2-15z" /><path d="M166 101c6 4 7 10 2 15-6-4-7-10-2-15z" />
      </g>
    );
  }
  if (theme === "cantaloupe" || theme === "hami") {
    return (
      <g fill="none" stroke={palette.detail} strokeWidth="2" opacity={opacity + 0.08} transform={`translate(0 ${shiftY})`}>
        <path d="M75 66c28 14 60 14 90 0M71 88c31 14 67 14 98 0M75 111c29 13 61 13 90 0" />
        <path d="M91 46c10 29 10 62 0 91M120 40c8 34 8 69 0 108M149 47c-10 29-10 61 0 90" />
      </g>
    );
  }
  if (theme === "canary") {
    return <path d={`M96 ${48 + shiftY}c-7 31-7 64 0 94M144 ${48 + shiftY}c7 31 7 64 0 94`} fill="none" stroke={palette.detail} strokeWidth="3" opacity=".22" />;
  }
  if (theme === "chamoe") {
    return (
      <g fill="none" stroke={palette.detail} strokeWidth="5" opacity=".32" transform={`translate(0 ${shiftY})`}>
        <path d="M92 45c-8 31-8 65 0 96M120 40v108M148 45c8 31 8 65 0 96" />
      </g>
    );
  }
  if (theme === "moon-gold") {
    return <path d={`M93 ${62 + shiftY}c-13 8-12 27 2 34 8 4 17 1 21-5-12 2-21-6-21-17 0-5 2-9 6-12-3-1-5-1-8 0z`} fill={palette.detail} opacity=".55" />;
  }
  return <path d={`M88 ${56 + shiftY}c14-12 31-16 48-13-18 3-31 11-41 24z`} fill={palette.highlight} opacity=".2" />;
}

interface PoseProps {
  id: string;
  theme: ThemeId;
  palette: HoneyPalette;
}
