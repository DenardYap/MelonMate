"use client";

import { create } from "zustand";
import type { HealthRewardBreakdown } from "./game";
import type { HealthWorkout } from "./types";

export interface HealthRewardEvent extends HealthRewardBreakdown {
  id: string;
  date: string;
  steps: number;
  standMinutes: number;
  workoutXp: number;
  workouts: HealthWorkout[];
}

interface HealthRewardQueueState {
  pending: HealthRewardEvent[];
  enqueue: (reward: Omit<HealthRewardEvent, "id">) => void;
  dismiss: (id: string) => void;
}

let rewardSequence = 0;

export const useHealthRewardQueue = create<HealthRewardQueueState>((set) => ({
  pending: [],
  enqueue: (reward) => set((state) => {
    const existingIndex = state.pending.findIndex((pendingReward) => pendingReward.date === reward.date);
    if (existingIndex < 0) {
      return {
        pending: [
          ...state.pending,
          { ...reward, id: `${reward.date}:${Date.now()}:${++rewardSequence}` },
        ],
      };
    }

    return {
      pending: state.pending.map((pendingReward, index) => index === existingIndex
        ? {
          ...pendingReward,
          steps: Math.max(pendingReward.steps, reward.steps),
          standMinutes: Math.max(pendingReward.standMinutes, reward.standMinutes),
          stepXp: pendingReward.stepXp + reward.stepXp,
          standXp: pendingReward.standXp + reward.standXp,
          workoutXp: pendingReward.workoutXp + reward.workoutXp,
          workouts: [
            ...pendingReward.workouts,
            ...reward.workouts.filter((workout) => !pendingReward.workouts.some((existing) => existing.id === workout.id)),
          ],
          stepMilestones: pendingReward.stepMilestones + reward.stepMilestones,
          standMilestones: pendingReward.standMilestones + reward.standMilestones,
          totalXp: pendingReward.totalXp + reward.totalXp,
        }
        : pendingReward),
    };
  }),
  dismiss: (id) => set((state) => ({
    pending: state.pending.filter((reward) => reward.id !== id),
  })),
}));
