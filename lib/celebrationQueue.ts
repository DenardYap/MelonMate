"use client";

import { create } from "zustand";

export type CelebrationKind = "level-up" | "achievement" | "health-reward" | "streak-reward";

export interface CelebrationRequest {
  key: string;
  kind: CelebrationKind;
  priority: number;
}

interface CelebrationQueueState {
  active: CelebrationRequest | null;
  waiting: CelebrationRequest[];
  request: (item: CelebrationRequest) => void;
  finish: (key: string) => void;
  cancel: (key: string) => void;
}

let activationScheduled = false;

export const useCelebrationQueue = create<CelebrationQueueState>((set, get) => {
  const scheduleActivation = () => {
    if (activationScheduled || get().active) return;
    activationScheduled = true;
    queueMicrotask(() => {
      activationScheduled = false;
      set((state) => {
        if (state.active || state.waiting.length === 0) return state;
        const [active, ...waiting] = [...state.waiting].sort(
          (a, b) => a.priority - b.priority || a.key.localeCompare(b.key)
        );
        return { ...state, active: active ?? null, waiting };
      });
    });
  };

  return {
    active: null,
    waiting: [],
    request: (item) => {
      set((state) => {
        if (state.active?.key === item.key || state.waiting.some((queued) => queued.key === item.key)) return state;
        return { ...state, waiting: [...state.waiting, item] };
      });
      scheduleActivation();
    },
    finish: (key) => {
      set((state) => state.active?.key === key
        ? { ...state, active: null }
        : { ...state, waiting: state.waiting.filter((item) => item.key !== key) });
      scheduleActivation();
    },
    cancel: (key) => {
      const wasActive = get().active?.key === key;
      set((state) => ({
        ...state,
        active: wasActive ? null : state.active,
        waiting: state.waiting.filter((item) => item.key !== key),
      }));
      if (wasActive) scheduleActivation();
    },
  };
});
