import type { Macros } from "./types";

export const EMPTY_MACROS: Macros = { cal: 0, protein: 0, carbs: 0, fat: 0 };

export function scaleMacros(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    cal: Math.round(per100.cal * f),
    protein: round1(per100.protein * f),
    carbs: round1(per100.carbs * f),
    fat: round1(per100.fat * f),
    ...scaleOptional(per100, f),
  };
}

export function mulMacros(m: Macros, f: number): Macros {
  return {
    cal: Math.round(m.cal * f),
    protein: round1(m.protein * f),
    carbs: round1(m.carbs * f),
    fat: round1(m.fat * f),
    ...scaleOptional(m, f),
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    cal: a.cal + b.cal,
    protein: round1(a.protein + b.protein),
    carbs: round1(a.carbs + b.carbs),
    fat: round1(a.fat + b.fat),
    ...sumOptional(a, b),
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, { ...EMPTY_MACROS });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Epley estimated one-rep max */
export function est1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmt1(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function scaleOptional(m: Macros, factor: number): Partial<Macros> {
  return {
    ...(m.fiber != null ? { fiber: round1(m.fiber * factor) } : {}),
    ...(m.sugar != null ? { sugar: round1(m.sugar * factor) } : {}),
    ...(m.sodiumMg != null ? { sodiumMg: Math.round(m.sodiumMg * factor) } : {}),
  };
}

function sumOptional(a: Macros, b: Macros): Partial<Macros> {
  return {
    ...(a.fiber != null || b.fiber != null ? { fiber: round1((a.fiber ?? 0) + (b.fiber ?? 0)) } : {}),
    ...(a.sugar != null || b.sugar != null ? { sugar: round1((a.sugar ?? 0) + (b.sugar ?? 0)) } : {}),
    ...(a.sodiumMg != null || b.sodiumMg != null
      ? { sodiumMg: Math.round((a.sodiumMg ?? 0) + (b.sodiumMg ?? 0)) }
      : {}),
  };
}

/** normalize an exercise name into a stable history key */
export function exKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
