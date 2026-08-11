"use client";

import { create } from "zustand";
import type { HealthRewardBreakdown } from "./game";

export interface HealthRewardEvent extends HealthRewardBreakdown {
  id: string;
  date: string;
  steps: number;
  standMinutes: number;
}

interface HealthRewardQueueState {
  pending: HealthRewardEvent[];
  enqueue: (reward: Omit<HealthRewardEvent, "id">) => void;
  dismiss: (id: string) => void;
}

let rewardSequence = 0;

export const useHealthRewardQueue = create<HealthRewardQueueState>((set) => ({
  pending: [],
  enqueue: (reward) => set((state) => ({
    pending: [
      ...state.pending,
      { ...reward, id: `${reward.date}:${Date.now()}:${++rewardSequence}` },
    ],
  })),
  dismiss: (id) => set((state) => ({
    pending: state.pending.filter((reward) => reward.id !== id),
  })),
}));
