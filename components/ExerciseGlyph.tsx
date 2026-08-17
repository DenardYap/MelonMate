import { AppIcon } from "@/components/icons";
import { exerciseMovement, type ExerciseMovement } from "@/lib/exerciseMovement";
import type { BiText, MuscleGroup } from "@/lib/types";

export function ExerciseGlyph({
  name,
  group,
  size = 20,
  compact = false,
  className = "",
}: {
  name: BiText | string;
  group?: MuscleGroup;
  size?: number;
  compact?: boolean;
  className?: string;
}) {
  const movement = exerciseMovement(name, group);
  return (
    <span
      className={`exercise-glyph movement-${movement} ${compact ? "is-compact" : ""} ${className}`}
      aria-hidden="true"
    >
      <MovementIcon movement={movement} size={size} />
    </span>
  );
}

function MovementIcon({ movement, size }: { movement: ExerciseMovement; size: number }) {
  if (movement === "run") return <AppIcon name="running" size={size} />;
  if (movement === "cycle") return <AppIcon name="cycling" size={size} />;
  if (movement === "core") return <AppIcon name="yoga" size={size} />;
  if (movement === "strength") return <AppIcon name="gym" size={size} />;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {movement === "squat" && <>
        <circle cx="12" cy="4" r="1.8" />
        <path d="M4 7h16M6 5.7v2.6M18 5.7v2.6M12 6v5.2l-4 3.2 1.3 5.2M12 11.2l4 3.2-1.3 5.2" />
      </>}
      {movement === "hinge" && <>
        <circle cx="15.6" cy="4.2" r="1.7" />
        <path d="m14.5 6-5 5.2 3.4 3.6M9.5 11.2 6.7 20M10.2 12.2 16.8 20M12.9 14.8l-1.2 3M5 18h14M4 16.8v2.4M20 16.8v2.4" />
      </>}
      {movement === "bench" && <>
        <circle cx="17.6" cy="12.4" r="1.6" />
        <path d="M4 7h16M6 5.7v2.6M18 5.7v2.6M8 13h8M9.5 13 8 9M14.5 13 16 9M5 16.5h14M7 16.5V20M17 16.5V20" />
      </>}
      {movement === "curl" && <>
        <circle cx="8.2" cy="4.2" r="1.7" />
        <path d="M8.2 6v7.5M8.2 8.2l4.3 2.2 2.6-3.1M7.8 13.5 5.8 20M8.5 13.5 12 20M13.8 5.8l2.6 2.2M13.2 7.7l3.8-3.8" />
      </>}
      {movement === "pull" && <>
        <path d="M3 4h18M5 2.8v2.4M19 2.8v2.4" />
        <circle cx="12" cy="8.2" r="1.7" />
        <path d="m10.8 6.8-3-2.8M13.2 6.8l3-2.8M12 10v5M12 12.2l-3.5 2M12 12.2l3.5 2M12 15l-2.5 5M12 15l2.5 5" />
      </>}
      {movement === "shoulders" && <>
        <circle cx="12" cy="6" r="1.8" />
        <path d="M12 8v6M12 10 7.5 7M12 10l4.5-3M7.5 7V4M16.5 7V4M5.5 3h4M14.5 3h4M12 14l-3 6M12 14l3 6" />
      </>}
      {movement === "lunge" && <>
        <circle cx="11" cy="4" r="1.7" />
        <path d="M11 6v6M11 8 7 10M11 8l4 2M11 12l-4 3-3 4M11 12l5 2 3 5M2 20h7M15 20h7" />
      </>}
      {movement === "calves" && <>
        <circle cx="10" cy="4" r="1.7" />
        <path d="M10 6v7M10 8l-3 3M10 8l3 3M10 13l-2 6M10 13l4 5M5 20h5M13 19h6M17 19v-3" />
      </>}
      {movement === "legs" && <>
        <circle cx="10" cy="4" r="1.7" />
        <path d="M10 6v7M10 8l-3 3M10 8l3 3M10 13l-3 6M10 13l5 2 3 4M5 20h5M16 20h5" />
      </>}
    </svg>
  );
}
