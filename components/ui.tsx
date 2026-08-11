"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AppIcon, iconFromLegacy, type IconName } from "@/components/icons";

/* ---------------------------------- GlassCard ---------------------------------- */

export function GlassCard({
  children,
  className = "",
  strong = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`${strong ? "glass-strong" : "glass"} ${onClick ? "press cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Sheet ---------------------------------- */

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = React.useId();
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = orig;
      previousFocus?.focus();
    };
  }, [open]);
  if (!mounted || !open) return null;
  return createPortal(
    <>
      <div className="sheet-dim" onClick={onClose} aria-hidden="true" />
      <section ref={sheetRef} className="sheet glass-strong" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
        <div className="sheet-grab" />
        <div className="sheet-header">
          {title && <div id={titleId} className="t-title min-w-0">{title}</div>}
          <button ref={closeRef} type="button" className="ibtn sheet-close press" onClick={onClose} aria-label="Close dialog">
            <AppIcon name="close" size={18} />
          </button>
        </div>
        {children}
      </section>
    </>,
    document.body
  );
}

/* ---------------------------------- Segmented ---------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`seg ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-item ${value === o.value ? "on" : ""}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Ring ---------------------------------- */

export function Ring({
  size = 170,
  stroke = 14,
  progress, // 0..1+
  center,
  sub,
  trackColor = "var(--track)",
  over = false,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  center: React.ReactNode;
  sub?: React.ReactNode;
  trackColor?: string;
  over?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={over ? "#ffb25c" : "var(--cal-from)"} />
            <stop offset="100%" stopColor={over ? "#e8544a" : "var(--cal-to)"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.3,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {center}
        {sub}
      </div>
    </div>
  );
}

/* ---------------------------------- MacroBar ---------------------------------- */

export function MacroBar({
  label,
  value,
  goal,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const p = goal > 0 ? Math.min(value / goal, 1) : 0;
  const overGoal = value > goal * 1.05;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="t-cap font-semibold">{label}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
        <div
          style={{
            width: `${p * 100}%`,
            height: "100%",
            borderRadius: 4,
            background: overGoal ? "var(--danger)" : color,
            transition: "width 0.7s cubic-bezier(0.2,0.8,0.3,1)",
          }}
        />
      </div>
      <div className="t-cap mt-1 tabular">
        <b style={{ color: "var(--ink)" }}>{Math.round(value)}</b>
        <span> / {goal}{unit}</span>
      </div>
    </div>
  );
}

/* ---------------------------------- Stepper ---------------------------------- */

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  format,
  bigStep,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  bigStep?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="flex items-center gap-2">
      {bigStep != null && (
        <button className="ibtn" style={{ width: 38, height: 38, fontSize: 13 }} onClick={() => onChange(clamp(value - bigStep))}>
          −{bigStep}
        </button>
      )}
      <button className="ibtn" onClick={() => onChange(clamp(value - step))} aria-label={`Decrease by ${step}`}><AppIcon name="minus" size={18} /></button>
      <div className="t-num text-center font-bold" style={{ minWidth: 64, fontSize: 20 }}>
        {format ? format(value) : value}
      </div>
      <button className="ibtn" onClick={() => onChange(clamp(value + step))} aria-label={`Increase by ${step}`}><AppIcon name="plus" size={18} /></button>
      {bigStep != null && (
        <button className="ibtn" style={{ width: 38, height: 38, fontSize: 13 }} onClick={() => onChange(clamp(value + bigStep))}>
          +{bigStep}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- Toast ---------------------------------- */

interface ToastMsg {
  id: number;
  text: string;
  icon?: IconName;
}

let pushToastImpl: ((t: Omit<ToastMsg, "id">) => void) | null = null;
const TOAST_DURATION_MS = 3_000;
const MAX_VISIBLE_TOASTS = 3;
const MAX_RENDERED_TOASTS = MAX_VISIBLE_TOASTS + 1;

export function toast(text: string, icon?: IconName | string) {
  pushToastImpl?.({ text, icon: icon ? iconFromLegacy(icon) : undefined });
}

export function ToastHost() {
  const pathname = usePathname();
  const [items, setItems] = useState<ToastMsg[]>([]);
  const itemsRef = useRef<ToastMsg[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      itemsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    pushToastImpl = (t) => {
      const id = ++idRef.current;
      const next = [...itemsRef.current, { ...t, id }];
      const removed = next.slice(0, -MAX_RENDERED_TOASTS);
      removed.forEach((item) => {
        const timer = timers.get(item.id);
        if (timer) clearTimeout(timer);
        timers.delete(item.id);
      });
      itemsRef.current = next.slice(-MAX_RENDERED_TOASTS);
      setItems(itemsRef.current);
      timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS));
    };
    return () => {
      pushToastImpl = null;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [dismiss]);

  const hasTabBar = !pathname.startsWith("/add")
    && !pathname.startsWith("/gym/session")
    && !pathname.startsWith("/agent")
    && !pathname.startsWith("/garden")
    && !pathname.startsWith("/friends");

  return (
    <div
      className={`toast-host${hasTabBar ? " toast-host--with-tabbar" : ""}`}
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {items.map((t, index) => {
        const isOverflowPreview = items.length > MAX_VISIBLE_TOASTS && index === 0;
        return (
          <div
            key={t.id}
            className={`toast-slot${isOverflowPreview ? " toast-slot--overflow" : ""}`}
          >
            <button
              type="button"
              className="toast-item glass-strong press"
              onClick={() => dismiss(t.id)}
              aria-label={`Dismiss notification: ${t.text}`}
            >
              {t.icon && <AppIcon name={t.icon} size={18} />}
              <span>{t.text}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Confetti ---------------------------------- */

export function fireConfetti() {
  fireConfettiImpl?.();
}

let fireConfettiImpl: (() => void) | null = null;

const CONF_COLORS = ["var(--melon-500)", "var(--canta-500)", "var(--suika-500)", "var(--melon-300)"];

export function ConfettiHost() {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    fireConfettiImpl = () => setBurst((b) => b + 1);
    return () => {
      fireConfettiImpl = null;
    };
  }, []);
  if (!burst) return null;
  return (
    <div key={burst} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 300, overflow: "hidden" }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = (i * 37 + (burst * 13) % 17) % 100;
        const delay = (i % 9) * 0.09;
        const dur = 1.7 + (i % 5) * 0.28;
        const size = 16 + (i % 4) * 6;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: 0,
              width: size * 0.55,
              height: size,
              borderRadius: i % 3 === 0 ? 999 : 3,
              background: CONF_COLORS[i % CONF_COLORS.length],
              transform: `rotate(${(i * 29) % 180}deg)`,
              animation: `confetti-fall ${dur}s ${delay}s ease-in forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------- EmptyState ---------------------------------- */

export function EmptyState({
  icon,
  emoji,
  title,
  hint,
  action,
}: {
  icon?: IconName;
  emoji?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state flex flex-col items-center text-center">
      <div className="empty-icon"><AppIcon name={icon ?? iconFromLegacy(emoji)} size={31} /></div>
      <div className="font-bold" style={{ fontSize: 17 }}>{title}</div>
      {hint && <div className="t-sub" style={{ maxWidth: 300 }}>{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------------------------------- misc ---------------------------------- */

export function Row({
  left,
  right,
  onClick,
  className = "",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`row ${onClick ? "press cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex-1 min-w-0">{left}</div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function useCountUp(target: number, ms = 600): number {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
