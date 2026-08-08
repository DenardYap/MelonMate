/**
 * Rename calorie keys written by older app versions. Values stay unchanged
 * because nutrition apps conventionally display food Calories as "cal".
 */
export function migrateLegacyCalorieData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => migrateLegacyCalorieData(item)) as T;
  }
  if (!value || typeof value !== "object") return value;

  const migrated: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextKey = key === "kcal" ? "cal" : key === "kcalGoal" ? "calGoal" : key;
    migrated[nextKey] = migrateLegacyCalorieData(child);
  }
  return migrated as T;
}

/** Repair the short-lived v11 build that inflated calorie values by 1,000. */
export function repairInflatedCalorieData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => repairInflatedCalorieData(item)) as T;
  }
  if (!value || typeof value !== "object") return value;

  const repaired: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    repaired[key] = (key === "cal" || key === "calGoal") && typeof child === "number"
      ? Math.round(child / 1_000)
      : repairInflatedCalorieData(child);
  }
  return repaired as T;
}
