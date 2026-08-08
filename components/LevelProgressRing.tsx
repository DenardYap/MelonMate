import { levelProgressFromXp } from "@/lib/game";

export default function LevelProgressRing({
  xp,
  size = 56,
  stroke = 7,
  label = "Level",
  shortLabel = "LV",
  className = "",
}: {
  xp: number;
  size?: number;
  stroke?: number;
  label?: string;
  shortLabel?: string;
  className?: string;
}) {
  const { level, earned, needed, progress } = levelProgressFromXp(xp);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      className={`level-progress-ring ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${level}, ${earned} / ${needed} XP`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="level-progress-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="level-progress-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span className="level-progress-number">
        {shortLabel && <small>{shortLabel}</small>}
        <strong>{level}</strong>
      </span>
    </span>
  );
}
