import type { BiText, MuscleGroup } from "./types";

export type ExerciseMovement =
  | "squat"
  | "hinge"
  | "bench"
  | "curl"
  | "pull"
  | "lunge"
  | "run"
  | "cycle"
  | "core"
  | "shoulders"
  | "calves"
  | "legs"
  | "strength";

/** Infers a small visual movement hint without adding metadata to saved plans. */
export function exerciseMovement(
  name: BiText | string,
  group?: MuscleGroup
): ExerciseMovement {
  const value = normalizeExerciseName(
    typeof name === "string" ? name : `${name.en} ${name.zh}`
  );

  if (matches(value, ["plank", "crunch", "sit up", "ab wheel", "dead bug", "bird dog", "wood chop", "pallof", "hollow hold", "leg raise", "捲腹", "平板", "核心", "死蟲", "鳥狗", "抬腿"])) return "core";
  if (matches(value, ["lunge", "split squat", "step up", "bulgarian", "弓步", "分腿蹲", "登階", "保加利亞"])) return "lunge";
  if (matches(value, ["farmer s carry", "farmer carry", "suitcase carry", "loaded carry", "農夫走路", "提箱走路"])) return "strength";
  if (matches(value, ["running", "treadmill", "跑步", "慢跑", "衝刺", "跑步機"]) || hasToken(value, ["run", "jog", "sprint"])) return "run";
  if (matches(value, ["cycling", "bicycle", "單車", "自行車", "飛輪"]) || hasToken(value, ["bike", "spin"])) return "cycle";
  if (matches(value, ["squat", "wall sit", "深蹲", "前蹲", "靜蹲"])) return "squat";
  if (matches(value, ["deadlift", "rdl", "good morning", "hip thrust", "glute bridge", "pull through", "kettlebell swing", "硬舉", "臀推", "臀橋", "早安式", "擺盪"])) return "hinge";
  if (matches(value, ["leg curl", "hamstring curl", "nordic curl", "腿彎舉", "北歐腿彎舉"])) return "legs";
  if (matches(value, ["bench press", "chest press", "floor press", "push up", "pec deck", "cable fly", "chest dip", "臥推", "胸推", "伏地挺身", "夾胸", "飛鳥", "雙槓撐體胸推"])) return "bench";
  if (matches(value, ["overhead press", "shoulder press", "military press", "lateral raise", "front raise", "rear delt", "face pull", "upright row", "肩推", "平舉", "臉拉", "後三角", "直立划船"])) return "shoulders";
  if (matches(value, ["bicep", "tricep", "curl", "skull crusher", "pressdown", "arm extension", "彎舉", "三頭", "二頭", "下壓"])) return "curl";
  if (matches(value, ["pull up", "chin up", "pulldown", "row", "pullover", "shrug", "rack pull", "引體向上", "下拉", "划船", "聳肩", "架上硬拉"])) return "pull";
  if (matches(value, ["calf", "提踵", "小腿"])) return "calves";
  if (matches(value, ["leg press", "leg extension", "kickback", "abduction", "hyperextension", "腿推", "腿部伸展", "腿伸展", "後踢", "髖外展", "背伸"])) return "legs";

  const fallback: Record<MuscleGroup, ExerciseMovement> = {
    quads: "legs",
    hams: "hinge",
    chest: "bench",
    back: "pull",
    shoulders: "shoulders",
    arms: "curl",
    core: "core",
    calves: "calves",
  };
  return group ? fallback[group] : "strength";
}

function normalizeExerciseName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim();
}

function matches(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function hasToken(value: string, terms: string[]) {
  const tokens = value.split(" ");
  return terms.some((term) => tokens.includes(term));
}
