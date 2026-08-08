import type {
  BiText,
  ExerciseEquipment,
  ExerciseSpec,
  MuscleGroup,
  WorkoutDay,
  WorkoutPlan,
  WorkoutWeek,
} from "./types";
import { exKey } from "./nutrition";

/* ------------------------------------------------------------------ */
/* Exercise dictionary: bilingual names + form cues + muscle group     */
/* ------------------------------------------------------------------ */

export type { MuscleGroup } from "./types";

export const GROUP_LABEL: Record<MuscleGroup, BiText> = {
  quads: { en: "Quads", zh: "股四頭" },
  hams: { en: "Hams & Glutes", zh: "腿後＋臀" },
  chest: { en: "Chest", zh: "胸" },
  back: { en: "Back", zh: "背" },
  shoulders: { en: "Shoulders", zh: "肩" },
  arms: { en: "Arms", zh: "手臂" },
  core: { en: "Core", zh: "核心" },
  calves: { en: "Calves", zh: "小腿" },
};

export interface ExDef {
  en: string;
  zh: string;
  cue?: BiText;
  group: MuscleGroup;
  aliases?: string[];
  equipment?: ExerciseEquipment;
  timed?: boolean;
}

const EX: Record<string, ExDef> = {
  backSquat: { en: "Back Squat", zh: "槓鈴深蹲", group: "quads", cue: { en: "Sit back and down, 15° toe flare, drive your knees out laterally", zh: "往後往下坐，腳尖外開 15°，膝蓋主動往外推" } },
  rdl: { en: "Romanian Deadlift", zh: "羅馬尼亞硬舉", group: "hams", cue: { en: "Neutral lower back, set your hips back, don't let your spine round", zh: "下背保持中立，臀部往後推，脊椎不要彎" } },
  hipThrust: { en: "Barbell Hip Thrust", zh: "槓鈴臀推", group: "hams", cue: { en: "Tuck your chin and rib cage down, only move your hips. Use a pad", zh: "收下巴收肋骨，只動髖部，記得墊護墊" } },
  legExt: { en: "Leg Extension", zh: "腿部伸展", group: "quads", cue: { en: "Squeeze your quads to move the weight", zh: "專注用股四頭肌出力，把重量「擠」上去" } },
  lyingLegCurl: { en: "Lying Leg Curl", zh: "俯臥腿彎舉", group: "hams", cue: { en: "Squeeze your hamstrings to move the weight", zh: "專注用腿後肌出力，把重量勾起來" } },
  hipAbduction: { en: "Machine Seated Hip Abduction", zh: "坐姿髖外展機", group: "hams", cue: { en: "Keep your butt in the seat, squeeze your glutes", zh: "屁股貼緊椅面，用臀肌把重量往外推" } },
  crunch: { en: "Crunch", zh: "捲腹", group: "core", cue: { en: "Flex your spine, don't yank your head with your arms", zh: "用腹肌捲起脊椎，不要用手拉頭" } },
  ezCurl: { en: "EZ Bar Curl", zh: "EZ 槓彎舉", group: "arms", cue: { en: "Press your pinky into the bar harder than your pointer finger", zh: "小指往槓上壓的力量比食指大" } },
  bench: { en: "Barbell Bench Press", zh: "槓鈴臥推", group: "chest", cue: { en: "Tuck elbows at 45°, squeeze your shoulder blades, stay firm on the bench", zh: "手肘收 45°，肩胛夾緊，全身穩穩貼住臥推椅" } },
  latPulldown: { en: "Lat Pulldown", zh: "滑輪下拉", group: "back", cue: { en: "Pull your elbows straight out to your sides, 1.5× shoulder width grip", zh: "手肘往身體兩側下拉，握距約 1.5 倍肩寬" } },
  militaryPress: { en: "Military Press", zh: "站姿肩推", group: "shoulders", cue: { en: "Squeeze your glutes to keep torso upright, press up and slightly back", zh: "夾緊臀部保持軀幹直立，往上並稍微往後推" } },
  csDbRow: { en: "Chest-supported DB Row", zh: "胸支撐啞鈴划船", group: "back", cue: { en: "Retract your scapulae on the pull, protract on the way down", zh: "拉起時肩胛後收，下放時讓肩胛前伸" } },
  csTBarRow: { en: "Chest-supported T-Bar Row", zh: "胸支撐 T 槓划船", group: "back", cue: { en: "Retract your scapulae on the pull, protract on the way down", zh: "拉起時肩胛後收，下放時讓肩胛前伸" } },
  cableFlye: { en: "Cable Flye", zh: "繩索飛鳥", group: "chest", cue: { en: "Keep scapulae retracted, pull your inner elbows together (not your hands)", zh: "肩胛保持後收，想像手肘內側互相靠近" } },
  dbSupCurl: { en: "Dumbbell Supinated Curl", zh: "啞鈴旋後彎舉", group: "arms", cue: { en: "Drive your pinky into the handle harder than your pointer finger", zh: "小指往握把壓的力量比食指大" } },
  ropeTricep: { en: "Single-Arm Rope Tricep Extension", zh: "單臂繩索三頭伸展", group: "arms", cue: { en: "Pull your arm behind your torso, don't move your upper arm", zh: "手臂往身體後方伸，上臂保持不動" } },
  hammerCurl: { en: "Hammer Curl", zh: "錘式彎舉", group: "arms", cue: { en: "Neutral grip, prevent your upper arm from moving", zh: "對握，上臂固定不要晃" } },
  deadlift: { en: "Deadlift", zh: "傳統硬舉", group: "hams", cue: { en: "Brace your lats, chest tall, hips high, pull the slack out of the bar first", zh: "背闊肌鎖緊、挺胸、臀位高，先把槓的鬆量拉掉再發力" } },
  dbLunge: { en: "Dumbbell Walking Lunge", zh: "啞鈴走路弓步", group: "quads", cue: { en: "10 steps each leg. Medium strides, let your torso lean forward", zh: "每腿 10 步，步幅適中，軀幹可以稍微前傾" } },
  slLegExt: { en: "Single-Leg Leg Extension", zh: "單腿腿伸展", group: "quads", cue: { en: "Squeeze your quads to move the weight", zh: "專注用股四頭肌出力" } },
  slLegCurl: { en: "Single-Leg Leg Curl", zh: "單腿腿彎舉", group: "hams", cue: { en: "Squeeze your hamstrings to move the weight", zh: "專注用腿後肌出力" } },
  calfRaise: { en: "Standing Calf Raise", zh: "站姿提踵", group: "calves", cue: { en: "Press all the way up to your toes, stretch at the bottom, don't bounce", zh: "推到最高點，底部完全伸展，不要彈震" } },
  plank: { en: "Plank", zh: "平板支撐", group: "core", cue: { en: "Squeeze your glutes, keep your hips low", zh: "夾臀，髖部壓低" } },
  dbInclinePress: { en: "Dumbbell Incline Press", zh: "上斜啞鈴臥推", group: "chest", cue: { en: "Keep your scapulae retracted and depressed", zh: "肩胛保持後收下壓" } },
  revGripPulldown: { en: "Reverse Grip Lat Pulldown", zh: "反手滑輪下拉", group: "back", cue: { en: "Pull your elbows down against your sides, shoulder width grip", zh: "手肘沿身體兩側往下拉，握距與肩同寬" } },
  assistedDip: { en: "Assisted Dip", zh: "輔助雙槓下推", group: "chest", cue: { en: "Tuck elbows at 45°, lean your torso forward 15°", zh: "手肘收 45°，軀幹前傾 15°" } },
  bbRow: { en: "Barbell Bent Over Row", zh: "槓鈴俯身划船", group: "back", cue: { en: "Torso at 45°, lower back neutral, double overhand grip", zh: "軀幹前傾 45°，下背中立，雙正握" } },
  dbLateralRaise: { en: "Dumbbell Lateral Raise", zh: "啞鈴側平舉", group: "shoulders", cue: { en: "Tilt the dumbbell so your pinky comes up first", zh: "傾斜啞鈴，讓小指先往上帶" } },
  facePull: { en: "Seated Face Pull", zh: "坐姿臉拉", group: "shoulders", cue: { en: "Pull your arms back and out", zh: "手臂往後往外拉開" } },
  gobletSquat: { en: "Goblet Squat", zh: "高腳杯深蹲", group: "quads", cue: { en: "Hold a dumbbell under your chin, sit back and down, knees out", zh: "啞鈴抱在下巴下方，往後往下坐，膝蓋往外" } },
  dbSlHipThrust: { en: "Dumbbell Single-Leg Hip Thrust", zh: "單腿啞鈴臀推", group: "hams", cue: { en: "Dumbbell on the working thigh, tuck chin and ribs, only move your hips", zh: "啞鈴放在工作腿大腿上，收下巴肋骨，只動髖" } },
  legPress: { en: "Leg Press", zh: "腿推機", group: "quads", cue: { en: "Medium foot placement, don't let your lower back round", zh: "腳掌放中間位置，下背不要離墊拱起" } },
  bicycleCrunch: { en: "Bicycle Crunch", zh: "單車捲腹", group: "core", cue: { en: "Flex and rotate: left elbow to right knee, right elbow to left knee", zh: "捲起加旋轉：左肘碰右膝、右肘碰左膝" } },
  dbCurl: { en: "Dumbbell Curl", zh: "啞鈴彎舉", group: "arms", cue: { en: "Control the negative, no swinging", zh: "下放要控制，不要甩" } },
  saPulldown: { en: "Single-Arm Pulldown", zh: "單臂滑輪下拉", group: "back", cue: { en: "Start with your non-dominant arm, match reps with the dominant arm", zh: "從非慣用手開始，慣用手做相同次數" } },
  dbShoulderPress: { en: "Dumbbell Seated Shoulder Press", zh: "坐姿啞鈴肩推", group: "shoulders", cue: { en: "Bring the dumbbells all the way down to your shoulders, torso upright", zh: "啞鈴完整下放到肩膀高度，軀幹保持直立" } },
  dbRow: { en: "Dumbbell Row", zh: "單臂啞鈴划船", group: "back", cue: { en: "Brace on a bench, pull your elbow against your side", zh: "撐在椅上，手肘沿身體側邊往後拉" } },
  seatedLegCurl: { en: "Seated Leg Curl", zh: "坐姿腿彎舉", group: "hams", cue: { en: "Squeeze your hamstrings to move the weight", zh: "專注用腿後肌出力" } },
  hangingLegRaise: { en: "Hanging Leg Raise", zh: "懸吊抬腿", group: "core", cue: { en: "Flex your abs to curl, use the captain's chair", zh: "用腹肌捲起骨盆，可用羅馬椅輔助" } },
  neutralPulldown: { en: "Neutral-Grip Pulldown", zh: "對握滑輪下拉", group: "back", cue: { en: "Palms facing each other, pull your elbows against your sides", zh: "掌心相對，手肘沿身體兩側下拉" } },
  cableRow: { en: "Cable Seated Row", zh: "坐姿繩索划船", group: "back", cue: { en: "V-bar grip, let your scapulae protract on the way forward", zh: "V 把手，前放時讓肩胛自然前伸" } },
  cableLateralRaise: { en: "Cable Lateral Raise", zh: "繩索側平舉", group: "shoulders", cue: { en: "Lean away from the machine, arms straight out to your side", zh: "身體稍微遠離機器，手臂往正側邊舉起" } },
  reversePecDeck: { en: "Reverse Pec Deck", zh: "反向蝴蝶機", group: "shoulders", cue: { en: "Protract your scapulae, sweep the weight out and back", zh: "肩胛前伸，把重量往外往後掃" } },
  saCableCurl: { en: "Single-Arm Cable Curl", zh: "單臂繩索彎舉", group: "arms", cue: { en: "Face away from the cable, keep your arm behind your torso", zh: "背對滑輪，手臂保持在身體後方" } },
  bulgarianSplit: { en: "Bulgarian Split Squat", zh: "保加利亞分腿蹲", group: "quads", cue: { en: "Back foot on a bench, torso slightly forward, front knee tracks over toes", zh: "後腳放椅上，軀幹微前傾，前膝對準腳尖" } },
  assistedPullup: { en: "Assisted Pull-up", zh: "輔助引體向上", group: "back", cue: { en: "Full hang at the bottom, chest to the bar, control the way down", zh: "底部完全伸展，胸口朝向單槓，下放控制" } },
  tricepPressdown: { en: "Rope Tricep Pressdown", zh: "繩索三頭下壓", group: "arms", cue: { en: "Elbows pinned to your sides, split the rope at the bottom", zh: "手肘貼緊身體兩側，底部把繩索往外分開" } },
  glutebridge: { en: "Glute Bridge (bodyweight warmup)", zh: "臀橋（熱身）", group: "hams", cue: { en: "Squeeze glutes hard at the top for 2 seconds", zh: "頂點夾臀 2 秒" } },

  // Quads and squat patterns
  frontSquat: { en: "Front Squat", zh: "前蹲", group: "quads", equipment: "barbell", aliases: ["barbell front squat"] },
  hackSquat: { en: "Hack Squat", zh: "哈克深蹲", group: "quads", equipment: "machine" },
  pendulumSquat: { en: "Pendulum Squat", zh: "鐘擺深蹲", group: "quads", equipment: "machine" },
  smithSquat: { en: "Smith Machine Squat", zh: "史密斯深蹲", group: "quads", equipment: "smith" },
  beltSquat: { en: "Belt Squat", zh: "腰帶深蹲", group: "quads", equipment: "machine" },
  boxSquat: { en: "Box Squat", zh: "箱式深蹲", group: "quads", equipment: "barbell" },
  splitSquat: { en: "Split Squat", zh: "分腿蹲", group: "quads", equipment: "dumbbell" },
  reverseLunge: { en: "Reverse Lunge", zh: "反向弓步", group: "quads", equipment: "dumbbell" },
  lateralLunge: { en: "Lateral Lunge", zh: "側弓步", group: "quads", equipment: "dumbbell" },
  stepUp: { en: "Dumbbell Step-up", zh: "啞鈴登階", group: "quads", equipment: "dumbbell", aliases: ["step up"] },
  sissySquat: { en: "Sissy Squat", zh: "西西深蹲", group: "quads", equipment: "bodyweight" },
  narrowLegPress: { en: "Narrow-Stance Leg Press", zh: "窄站距腿推", group: "quads", equipment: "machine" },
  wallSit: { en: "Wall Sit", zh: "靠牆靜蹲", group: "quads", equipment: "bodyweight", timed: true },

  // Hamstrings, glutes, and hip hinges
  sumoDeadlift: { en: "Sumo Deadlift", zh: "相撲硬舉", group: "hams", equipment: "barbell" },
  trapBarDeadlift: { en: "Trap Bar Deadlift", zh: "六角槓硬舉", group: "hams", equipment: "barbell", aliases: ["hex bar deadlift"] },
  stiffLegDeadlift: { en: "Stiff-Leg Deadlift", zh: "直腿硬舉", group: "hams", equipment: "barbell" },
  singleLegRdl: { en: "Single-Leg Romanian Deadlift", zh: "單腿羅馬尼亞硬舉", group: "hams", equipment: "dumbbell", aliases: ["single leg rdl"] },
  goodMorning: { en: "Barbell Good Morning", zh: "槓鈴早安式", group: "hams", equipment: "barbell" },
  nordicCurl: { en: "Nordic Hamstring Curl", zh: "北歐腿彎舉", group: "hams", equipment: "bodyweight", aliases: ["nordic curl"] },
  gluteHamRaise: { en: "Glute-Ham Raise", zh: "臀腿挺身", group: "hams", equipment: "machine", aliases: ["ghr"] },
  cablePullThrough: { en: "Cable Pull-through", zh: "繩索胯下拉", group: "hams", equipment: "cable", aliases: ["cable pull through", "cable pull"] },
  backExtension: { en: "45° Back Extension", zh: "45 度背伸", group: "hams", equipment: "bodyweight", aliases: ["hyperextension"] },
  reverseHyper: { en: "Reverse Hyperextension", zh: "反向背伸", group: "hams", equipment: "machine" },
  cableKickback: { en: "Cable Glute Kickback", zh: "繩索臀後踢", group: "hams", equipment: "cable", aliases: ["glute kickback"] },
  frogPump: { en: "Frog Pump", zh: "蛙式臀橋", group: "hams", equipment: "bodyweight" },
  kettlebellSwing: { en: "Kettlebell Swing", zh: "壺鈴擺盪", group: "hams", equipment: "kettlebell" },
  smithHipThrust: { en: "Smith Machine Hip Thrust", zh: "史密斯臀推", group: "hams", equipment: "smith" },

  // Chest presses and flyes
  inclineBench: { en: "Incline Barbell Bench Press", zh: "上斜槓鈴臥推", group: "chest", equipment: "barbell", aliases: ["incline press", "incline bench"] },
  declineBench: { en: "Decline Barbell Bench Press", zh: "下斜槓鈴臥推", group: "chest", equipment: "barbell", aliases: ["decline press"] },
  dbBench: { en: "Dumbbell Bench Press", zh: "啞鈴臥推", group: "chest", equipment: "dumbbell", aliases: ["dumbbell chest press"] },
  dbDeclinePress: { en: "Dumbbell Decline Press", zh: "下斜啞鈴臥推", group: "chest", equipment: "dumbbell" },
  machineChestPress: { en: "Machine Chest Press", zh: "機械式胸推", group: "chest", equipment: "machine", aliases: ["seated chest press"] },
  smithBench: { en: "Smith Machine Bench Press", zh: "史密斯臥推", group: "chest", equipment: "smith" },
  pushUp: { en: "Push-up", zh: "伏地挺身", group: "chest", equipment: "bodyweight", aliases: ["push up"] },
  weightedPushUp: { en: "Weighted Push-up", zh: "負重伏地挺身", group: "chest", equipment: "bodyweight" },
  chestDip: { en: "Chest Dip", zh: "雙槓撐體胸推", group: "chest", equipment: "bodyweight", aliases: ["dip"] },
  pecDeck: { en: "Pec Deck Fly", zh: "蝴蝶機夾胸", group: "chest", equipment: "machine", aliases: ["machine fly"] },
  lowCableFly: { en: "Low-to-High Cable Fly", zh: "低至高繩索飛鳥", group: "chest", equipment: "cable" },
  highCableFly: { en: "High-to-Low Cable Fly", zh: "高至低繩索飛鳥", group: "chest", equipment: "cable" },
  floorPress: { en: "Barbell Floor Press", zh: "槓鈴地板臥推", group: "chest", equipment: "barbell" },
  svendPress: { en: "Svend Press", zh: "斯文德推舉", group: "chest", equipment: "other", aliases: ["plate press"] },

  // Back and pulling movements
  pullUp: { en: "Pull-up", zh: "引體向上", group: "back", equipment: "bodyweight", aliases: ["pull up"] },
  chinUp: { en: "Chin-up", zh: "反手引體向上", group: "back", equipment: "bodyweight", aliases: ["chin up"] },
  widePulldown: { en: "Wide-Grip Lat Pulldown", zh: "寬握滑輪下拉", group: "back", equipment: "cable" },
  closePulldown: { en: "Close-Grip Lat Pulldown", zh: "窄握滑輪下拉", group: "back", equipment: "cable" },
  straightArmPulldown: { en: "Straight-Arm Cable Pulldown", zh: "直臂繩索下拉", group: "back", equipment: "cable", aliases: ["straight arm pull down", "cable pull"] },
  cablePullover: { en: "Cable Pullover", zh: "繩索直臂下拉", group: "back", equipment: "cable", aliases: ["cable pull over", "cable pull"] },
  dbPullover: { en: "Dumbbell Pullover", zh: "啞鈴過頭拉", group: "back", equipment: "dumbbell" },
  machineRow: { en: "Seated Machine Row", zh: "坐姿機械划船", group: "back", equipment: "machine" },
  highRow: { en: "Machine High Row", zh: "機械高位划船", group: "back", equipment: "machine" },
  lowRow: { en: "Machine Low Row", zh: "機械低位划船", group: "back", equipment: "machine" },
  pendlayRow: { en: "Pendlay Row", zh: "彭德雷划船", group: "back", equipment: "barbell" },
  sealRow: { en: "Seal Row", zh: "俯臥槓鈴划船", group: "back", equipment: "barbell" },
  landmineRow: { en: "Landmine Row", zh: "地雷管划船", group: "back", equipment: "landmine", aliases: ["t bar row"] },
  meadowsRow: { en: "Meadows Row", zh: "梅多斯划船", group: "back", equipment: "landmine" },
  invertedRow: { en: "Inverted Row", zh: "反向划船", group: "back", equipment: "bodyweight", aliases: ["bodyweight row"] },
  rackPull: { en: "Rack Pull", zh: "架上硬拉", group: "back", equipment: "barbell" },
  barbellShrug: { en: "Barbell Shrug", zh: "槓鈴聳肩", group: "back", equipment: "barbell" },
  dbShrug: { en: "Dumbbell Shrug", zh: "啞鈴聳肩", group: "back", equipment: "dumbbell" },

  // Shoulders and rear delts
  overheadPress: { en: "Barbell Overhead Press", zh: "槓鈴過頭推舉", group: "shoulders", equipment: "barbell", aliases: ["ohp", "shoulder press"] },
  arnoldPress: { en: "Arnold Press", zh: "阿諾肩推", group: "shoulders", equipment: "dumbbell" },
  machineShoulderPress: { en: "Machine Shoulder Press", zh: "機械式肩推", group: "shoulders", equipment: "machine" },
  smithShoulderPress: { en: "Smith Machine Shoulder Press", zh: "史密斯肩推", group: "shoulders", equipment: "smith" },
  landminePress: { en: "Single-Arm Landmine Press", zh: "單臂地雷管推舉", group: "shoulders", equipment: "landmine" },
  dbFrontRaise: { en: "Dumbbell Front Raise", zh: "啞鈴前平舉", group: "shoulders", equipment: "dumbbell" },
  cableFrontRaise: { en: "Cable Front Raise", zh: "繩索前平舉", group: "shoulders", equipment: "cable" },
  uprightRow: { en: "Cable Upright Row", zh: "繩索直立划船", group: "shoulders", equipment: "cable" },
  rearDeltFly: { en: "Dumbbell Rear Delt Fly", zh: "啞鈴後三角飛鳥", group: "shoulders", equipment: "dumbbell" },
  cableRearDeltFly: { en: "Cable Rear Delt Fly", zh: "繩索後三角飛鳥", group: "shoulders", equipment: "cable" },
  bandPullApart: { en: "Band Pull-apart", zh: "彈力帶拉開", group: "shoulders", equipment: "band" },
  inclineYRaise: { en: "Incline Y-Raise", zh: "上斜 Y 字平舉", group: "shoulders", equipment: "dumbbell", aliases: ["y raise"] },

  // Biceps, triceps, and forearms
  preacherCurl: { en: "EZ-Bar Preacher Curl", zh: "EZ 槓牧師椅彎舉", group: "arms", equipment: "barbell" },
  dbPreacherCurl: { en: "Dumbbell Preacher Curl", zh: "啞鈴牧師椅彎舉", group: "arms", equipment: "dumbbell" },
  cableCurl: { en: "Cable Curl", zh: "繩索彎舉", group: "arms", equipment: "cable" },
  inclineCurl: { en: "Incline Dumbbell Curl", zh: "上斜啞鈴彎舉", group: "arms", equipment: "dumbbell" },
  concentrationCurl: { en: "Concentration Curl", zh: "集中彎舉", group: "arms", equipment: "dumbbell" },
  spiderCurl: { en: "Spider Curl", zh: "蜘蛛彎舉", group: "arms", equipment: "dumbbell" },
  reverseCurl: { en: "EZ-Bar Reverse Curl", zh: "EZ 槓反手彎舉", group: "arms", equipment: "barbell" },
  bayesianCurl: { en: "Bayesian Cable Curl", zh: "貝葉斯繩索彎舉", group: "arms", equipment: "cable" },
  machineCurl: { en: "Machine Biceps Curl", zh: "機械式二頭彎舉", group: "arms", equipment: "machine" },
  skullCrusher: { en: "EZ-Bar Skull Crusher", zh: "EZ 槓仰臥三頭伸展", group: "arms", equipment: "barbell", aliases: ["lying tricep extension"] },
  overheadTricep: { en: "Cable Overhead Tricep Extension", zh: "繩索過頭三頭伸展", group: "arms", equipment: "cable" },
  dbOverheadTricep: { en: "Dumbbell Overhead Tricep Extension", zh: "啞鈴過頭三頭伸展", group: "arms", equipment: "dumbbell" },
  closeGripBench: { en: "Close-Grip Bench Press", zh: "窄握臥推", group: "arms", equipment: "barbell" },
  jmPress: { en: "JM Press", zh: "JM 推舉", group: "arms", equipment: "barbell" },
  cableTricepKickback: { en: "Cable Tricep Kickback", zh: "繩索三頭後伸", group: "arms", equipment: "cable" },
  benchDip: { en: "Bench Dip", zh: "椅上屈臂撐體", group: "arms", equipment: "bodyweight" },
  wristCurl: { en: "Wrist Curl", zh: "腕彎舉", group: "arms", equipment: "dumbbell" },
  reverseWristCurl: { en: "Reverse Wrist Curl", zh: "反向腕彎舉", group: "arms", equipment: "dumbbell" },

  // Core and loaded carries
  cableCrunch: { en: "Kneeling Cable Crunch", zh: "跪姿繩索捲腹", group: "core", equipment: "cable" },
  abWheel: { en: "Ab Wheel Rollout", zh: "健腹輪", group: "core", equipment: "bodyweight", aliases: ["ab rollout"] },
  reverseCrunch: { en: "Reverse Crunch", zh: "反向捲腹", group: "core", equipment: "bodyweight" },
  sitUp: { en: "Sit-up", zh: "仰臥起坐", group: "core", equipment: "bodyweight", aliases: ["sit up"] },
  russianTwist: { en: "Russian Twist", zh: "俄羅斯轉體", group: "core", equipment: "bodyweight" },
  deadBug: { en: "Dead Bug", zh: "死蟲式", group: "core", equipment: "bodyweight" },
  birdDog: { en: "Bird Dog", zh: "鳥狗式", group: "core", equipment: "bodyweight" },
  mountainClimber: { en: "Mountain Climber", zh: "登山者", group: "core", equipment: "bodyweight" },
  pallofPress: { en: "Pallof Press", zh: "帕洛夫推", group: "core", equipment: "cable" },
  sidePlank: { en: "Side Plank", zh: "側平板支撐", group: "core", equipment: "bodyweight", timed: true },
  cableWoodchop: { en: "Cable Wood Chop", zh: "繩索伐木", group: "core", equipment: "cable", aliases: ["woodchopper"] },
  hollowHold: { en: "Hollow Body Hold", zh: "中空支撐", group: "core", equipment: "bodyweight", timed: true },
  farmersCarry: { en: "Farmer's Carry", zh: "農夫走路", group: "core", equipment: "dumbbell", timed: true, aliases: ["farmer carry"] },
  suitcaseCarry: { en: "Suitcase Carry", zh: "單手提箱走路", group: "core", equipment: "dumbbell", timed: true },

  // Calves
  seatedCalfRaise: { en: "Seated Calf Raise", zh: "坐姿提踵", group: "calves", equipment: "machine" },
  donkeyCalfRaise: { en: "Donkey Calf Raise", zh: "驢式提踵", group: "calves", equipment: "machine" },
  legPressCalfRaise: { en: "Leg Press Calf Raise", zh: "腿推機提踵", group: "calves", equipment: "machine" },
  singleLegCalfRaise: { en: "Single-Leg Calf Raise", zh: "單腿提踵", group: "calves", equipment: "bodyweight" },
};

export function exDef(key: string): ExDef | undefined {
  return EX[key];
}

function inferEquipment(def: ExDef): ExerciseEquipment {
  if (def.equipment) return def.equipment;
  const name = def.en.toLowerCase();
  if (name.includes("dumbbell") || name.includes("db ") || name.includes("goblet") || name.includes("hammer curl") || name.includes("bulgarian")) return "dumbbell";
  if (name.includes("barbell") || name.includes("ez bar") || name.includes("military") || name.includes("romanian deadlift") || name === "deadlift" || name === "back squat" || name.includes("hip thrust")) return "barbell";
  if (name.includes("cable") || name.includes("pulldown") || name.includes("face pull") || name.includes("pressdown") || name.includes("rope")) return "cable";
  if (name.includes("machine") || name.includes("leg curl") || name.includes("leg extension") || name.includes("pec deck") || name.includes("leg press") || name.includes("assisted")) return "machine";
  if (name.includes("standing calf raise") || name.includes("t-bar row")) return "machine";
  if (name.includes("plank") || name.includes("crunch") || name.includes("hanging") || name.includes("glute bridge")) return "bodyweight";
  return "other";
}

export const EXERCISE_LIBRARY = Object.entries(EX).map(([key, d]) => ({
  key,
  ...d,
  equipment: inferEquipment(d),
}));

export function groupOf(nameEn: string): MuscleGroup {
  const hit = Object.values(EX).find((d) => d.en.toLowerCase() === nameEn.toLowerCase());
  return hit?.group ?? "arms";
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

let uid = 0;
function ex(
  key: string,
  sets: number,
  reps: string,
  rpe: number | undefined,
  restMin: number | undefined,
  seedWeight?: number
): ExerciseSpec {
  const d = EX[key];
  uid += 1;
  return {
    id: `${key}-${uid}`,
    historyKey: exKey(d.en),
    name: { en: d.en, zh: d.zh },
    sets,
    reps,
    rpe,
    restMin,
    cue: d.cue,
    seedWeight,
  };
}

function day(idPrefix: string, en: string, zh: string, exercises: ExerciseSpec[]): WorkoutDay {
  uid += 1;
  return { id: `${idPrefix}-${uid}`, name: { en, zh }, exercises };
}

/* ------------------------------------------------------------------ */
/* Bernard — 8-week hypertrophy (imported from the spreadsheet)        */
/* Weeks 1–4 = Block A, Weeks 5–8 = Block B. All exercises 3 sets.     */
/* Seed weights = last working weights recorded in the sheet (lb).     */
/* ------------------------------------------------------------------ */

function blockAWeek(week1: boolean): WorkoutWeek {
  return {
    days: [
      day("lb1", "Lower Body #1", "下肢 #1", [
        ex("backSquat", 3, "6", 7, 3, 145),
        ex("rdl", 3, "10", 7, 2, 135),
        ex("hipThrust", 3, "12", 8, 2, 25),
        ex("legExt", 3, "12", 9, 1, 95),
        ex("lyingLegCurl", 3, "12", 9, 1, 100),
        ex("hipAbduction", 3, "6", 7, 1),
        ex("crunch", 3, "12", 7, 1),
        ex("ezCurl", 3, "12", undefined, 1, 50),
      ]),
      day("ub1", "Upper Body #1", "上肢 #1", [
        ex("bench", 3, "5", 7, 3, 155),
        ex("latPulldown", 3, "10", 8, 2, 55),
        ex("militaryPress", 3, "10", 7, 3, 55),
        week1 ? ex("csDbRow", 3, "12", 8, 2, 35) : ex("csTBarRow", 3, "12", 8, 2, 35),
        ex("cableFlye", 3, "12", 8, 1, 45),
        ex("dbSupCurl", 3, "10", 8, 1, 25),
        ex("ropeTricep", 3, "12", 8, 1, 15),
        ex("hammerCurl", 3, "12", undefined, 1, 35),
      ]),
      day("lb2", "Lower Body #2", "下肢 #2", [
        ex("deadlift", 3, "8", 7, 3, 185),
        ex("dbLunge", 3, "10/leg", 8, 2, 25),
        ex("slLegExt", 3, "15", 8, 1, 40),
        ex("slLegCurl", 3, "15", 8, 1, 40),
        ex("hipAbduction", 3, "15", 9, 1, 70),
        ex("calfRaise", 3, "12", 8, 1, 90),
        ex("plank", 3, "20 sec", 8, 1),
      ]),
      day("ub2", "Upper Body #2", "上肢 #2", [
        ex("dbInclinePress", 3, "8", 8, 2, 45),
        ex("revGripPulldown", 3, "8", 8, 2, 60),
        ex("assistedDip", 3, "10", 7, 2),
        ex("bbRow", 3, "12", 7, 2, 30),
        ex("dbLateralRaise", 3, "15", 8, 1, 25),
        ex("facePull", 3, "15", 8, 1, 35),
        ex("hammerCurl", 3, "8", 9, 1, 40),
        ...(week1 ? [ex("bench", 3, "10", 7, 2, 135)] : []),
      ]),
    ],
  };
}

function blockBWeek(): WorkoutWeek {
  return {
    days: [
      day("lb1", "Lower Body #1", "下肢 #1", [
        ex("deadlift", 3, "5", 8, 3, 185),
        ex("gobletSquat", 3, "12", 8, 2),
        ex("dbSlHipThrust", 3, "10/leg", 9, 2),
        ex("legPress", 3, "12", 8, 1),
        ex("lyingLegCurl", 3, "15", 9, 1, 100),
        ex("calfRaise", 3, "8", 8, 1, 90),
        ex("bicycleCrunch", 3, "12/side", 8, 1),
        ex("dbCurl", 3, "12", undefined, 1),
      ]),
      day("ub1", "Upper Body #1", "上肢 #1", [
        ex("bench", 3, "8", 8, 3, 155),
        ex("saPulldown", 3, "8/arm", 8, 2),
        ex("dbShoulderPress", 3, "12", 7, 2),
        ex("dbRow", 3, "12/arm", 8, 2),
        ex("assistedDip", 3, "6", 8, 1),
        ex("facePull", 3, "15", 9, 1, 35),
        ex("ezCurl", 3, "12", 9, 1, 50),
        ex("hammerCurl", 3, "12", undefined, 1, 40),
      ]),
      day("lb2", "Lower Body #2", "下肢 #2", [
        ex("backSquat", 3, "8", 8, 3, 145),
        ex("hipThrust", 3, "8", 8, 2, 25),
        ex("rdl", 3, "12", 8, 2, 135),
        ex("seatedLegCurl", 3, "8", 9, 1),
        ex("calfRaise", 3, "6", 9, 1, 90),
        ex("hangingLegRaise", 3, "6", 8, 1),
        ex("hipAbduction", 3, "20", 9, 1, 70),
      ]),
      day("ub2", "Upper Body #2", "上肢 #2", [
        ex("militaryPress", 3, "6", 8, 3, 55),
        ex("neutralPulldown", 3, "6", 8, 3),
        ex("dbInclinePress", 3, "8", 8, 2, 45),
        ex("cableRow", 3, "8", 9, 2),
        ex("cableLateralRaise", 3, "12", 8, 1),
        ex("reversePecDeck", 3, "12", 8, 1),
        ex("saCableCurl", 3, "15/arm", 9, 1),
      ]),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Girlfriend — 4 days/week ~60 min hypertrophy                        */
/* Upper/Lower split, glute + quad emphasis, RPE-based progression.    */
/* ------------------------------------------------------------------ */

function gfWeek(): WorkoutWeek {
  return {
    days: [
      day("g-lba", "Lower · Glutes", "下肢・臀腿", [
        ex("glutebridge", 2, "15", 5, 1),
        ex("hipThrust", 4, "10", 8, 2),
        ex("gobletSquat", 3, "10", 7, 2),
        ex("rdl", 3, "10", 7, 2),
        ex("bulgarianSplit", 2, "10/leg", 8, 1.5),
        ex("hipAbduction", 3, "15", 9, 1),
        ex("calfRaise", 3, "12", 8, 1),
      ]),
      day("g-uba", "Upper · Push", "上肢・推", [
        ex("dbShoulderPress", 3, "10", 8, 2),
        ex("dbInclinePress", 3, "10", 8, 2),
        ex("latPulldown", 3, "10", 8, 2),
        ex("cableRow", 3, "12", 8, 1.5),
        ex("dbLateralRaise", 3, "15", 8, 1),
        ex("tricepPressdown", 3, "12", 8, 1),
        ex("crunch", 3, "15", 8, 1),
      ]),
      day("g-lbb", "Lower · Quads", "下肢・腿", [
        ex("gobletSquat", 4, "8", 8, 2.5),
        ex("legPress", 3, "12", 8, 2),
        ex("lyingLegCurl", 3, "12", 8, 1.5),
        ex("dbLunge", 3, "10/leg", 8, 1.5),
        ex("legExt", 3, "15", 9, 1),
        ex("plank", 3, "30 sec", 8, 1),
      ]),
      day("g-ubb", "Upper · Pull", "上肢・拉", [
        ex("assistedPullup", 3, "8", 8, 2),
        ex("csDbRow", 3, "10", 8, 2),
        ex("bench", 3, "10", 8, 2),
        ex("facePull", 3, "15", 8, 1),
        ex("dbCurl", 3, "12", 8, 1),
        ex("hammerCurl", 2, "12", 9, 1),
        ex("bicycleCrunch", 3, "15/side", 8, 1),
      ]),
    ],
  };
}

export function buildBernardPlan(): WorkoutPlan {
  return {
    id: "bernard-hypertrophy-8w",
    name: { en: "Bernard · Hypertrophy 8 weeks", zh: "Bernard・增肌 8 週" },
    note: {
      en: "All exercises 3 sets. Train Tue / Thu / Sat / Sun. When you hit target reps at or under target RPE, add weight next time.",
      zh: "所有動作 3 組。二／四／六／日訓練。若達到目標次數且 RPE 不超標，下次就加重。",
    },
    daysPerWeek: 4,
    focus: "hypertrophy",
    goals: ["gain", "maintain"],
    intensity: "focused",
    weeks: [
      blockAWeek(true),
      blockAWeek(false),
      blockAWeek(false),
      blockAWeek(false),
      blockBWeek(),
      blockBWeek(),
      blockBWeek(),
      blockBWeek(),
    ],
  };
}

export function buildGfPlan(): WorkoutPlan {
  return {
    id: "gf-hypertrophy-8w",
    name: { en: "Melon · Hypertrophy 4-day", zh: "瓜瓜・增肌 4 日" },
    note: {
      en: "~60 min per session, 4 days a week (e.g. Tue / Thu / Sat / Sun). Last set of each exercise close to failure (RPE 8–9). Add weight when the top of the rep range feels easier than the target RPE.",
      zh: "每次約 60 分鐘、每週 4 天（例如二／四／六／日）。每個動作最後一組接近力竭（RPE 8–9）。當最高次數做起來比目標 RPE 輕鬆，就加重。",
    },
    daysPerWeek: 4,
    focus: "hypertrophy",
    goals: ["gain", "maintain"],
    intensity: "focused",
    weeks: [gfWeek(), gfWeek(), gfWeek(), gfWeek(), gfWeek(), gfWeek(), gfWeek(), gfWeek()],
  };
}

/* ------------------------------------------------------------------ */
/* Goal-based plan library used by onboarding and the Plans tab.       */
/* Loads are intentionally unset: each person starts at an honest RPE. */
/* ------------------------------------------------------------------ */

function repeatWeek(days: WorkoutDay[], count = 8): WorkoutWeek[] {
  return Array.from({ length: count }, () => ({ days: structuredClone(days) }));
}

function libraryPlan(
  id: string,
  name: BiText,
  note: BiText,
  daysPerWeek: 3 | 4 | 5 | 6,
  focus: "general" | "hypertrophy" | "strength",
  goals: ("lose" | "maintain" | "gain")[],
  intensity: "light" | "moderate" | "focused" | "intense",
  days: WorkoutDay[]
): WorkoutPlan {
  return { id, name, note, daysPerWeek, focus, goals, intensity, weeks: repeatWeek(days) };
}

export function buildSuggestedPlans(): WorkoutPlan[] {
  const inclusiveNote = {
    en: "Designed for women, men, and nonbinary lifters. Choose loads that leave the prescribed reps in reserve and progress gradually.",
    zh: "適合女性、男性與非二元訓練者。依目標 RPE 選擇重量，循序漸進。",
  };

  return [
    libraryPlan(
      "balanced-foundation-3d",
      { en: "Light · Balanced Foundation", zh: "輕量・全身基礎" },
      { en: `Three efficient full-body days for consistency, health, and gradual fat loss. ${inclusiveNote.en}`, zh: `每週三次高效率全身訓練，建立習慣並輔助減脂。${inclusiveNote.zh}` },
      3, "general", ["lose", "maintain"], "light",
      [
        day("bf-a", "Full Body A", "全身 A", [ex("gobletSquat", 3, "8-10", 7, 2), ex("dbInclinePress", 3, "8-10", 7, 2), ex("cableRow", 3, "10-12", 7, 1.5), ex("rdl", 2, "10", 7, 2), ex("plank", 3, "30 sec", 7, 1)]),
        day("bf-b", "Full Body B", "全身 B", [ex("legPress", 3, "10", 7, 2), ex("latPulldown", 3, "10", 7, 2), ex("dbShoulderPress", 3, "10", 7, 1.5), ex("hipThrust", 3, "10", 7, 2), ex("bicycleCrunch", 3, "12/side", 7, 1)]),
        day("bf-c", "Full Body C", "全身 C", [ex("dbLunge", 3, "10/leg", 8, 2), ex("bench", 3, "8", 7, 2), ex("dbRow", 3, "10/arm", 8, 1.5), ex("lyingLegCurl", 2, "12", 8, 1.5), ex("facePull", 2, "15", 8, 1)]),
      ]
    ),
    libraryPlan(
      "hypertrophy-fullbody-3d",
      { en: "Light · Full-Body Hypertrophy", zh: "輕量・全身增肌" },
      { en: `A recoverable three-day muscle-building plan with full-body frequency. ${inclusiveNote.en}`, zh: `每週三日、恢復友善的全身增肌計畫。${inclusiveNote.zh}` },
      3, "hypertrophy", ["gain", "maintain"], "light",
      [
        day("hf-a", "Full Body · Squat", "全身・深蹲", [ex("backSquat", 3, "6-8", 8, 2.5), ex("bench", 3, "8-10", 8, 2), ex("latPulldown", 3, "10-12", 8, 1.5), ex("lyingLegCurl", 3, "12", 8, 1.5), ex("dbLateralRaise", 3, "15", 9, 1)]),
        day("hf-b", "Full Body · Hinge", "全身・髖鉸鏈", [ex("rdl", 3, "8-10", 8, 2.5), ex("dbShoulderPress", 3, "8-10", 8, 2), ex("csDbRow", 3, "10-12", 8, 1.5), ex("legExt", 3, "12-15", 9, 1), ex("dbCurl", 2, "12", 9, 1)]),
        day("hf-c", "Full Body · Volume", "全身・訓練量", [ex("legPress", 4, "10-12", 8, 2), ex("dbInclinePress", 3, "10-12", 8, 1.5), ex("neutralPulldown", 3, "10-12", 8, 1.5), ex("hipThrust", 3, "10-12", 8, 2), ex("tricepPressdown", 2, "12-15", 9, 1)]),
      ]
    ),
    libraryPlan(
      "strength-base-3d",
      { en: "Light · Strength Base", zh: "輕量・力量基礎" },
      { en: `Three focused days built around squat, bench, and deadlift technique. ${inclusiveNote.en}`, zh: `每週三日，專注深蹲、臥推與硬舉技術。${inclusiveNote.zh}` },
      3, "strength", ["gain", "maintain"], "light",
      [
        day("sb-s", "Squat Day", "深蹲日", [ex("backSquat", 4, "5", 7, 3), ex("bench", 3, "6", 7, 2.5), ex("rdl", 3, "8", 7, 2), ex("plank", 3, "30 sec", 7, 1)]),
        day("sb-b", "Bench Day", "臥推日", [ex("bench", 4, "5", 7, 3), ex("bbRow", 4, "6-8", 8, 2), ex("gobletSquat", 3, "10", 7, 2), ex("tricepPressdown", 3, "10", 8, 1)]),
        day("sb-d", "Deadlift Day", "硬舉日", [ex("deadlift", 3, "5", 7, 3), ex("militaryPress", 4, "6", 7, 2.5), ex("latPulldown", 3, "8", 8, 2), ex("dbLunge", 2, "10/leg", 8, 2)]),
      ]
    ),
    libraryPlan(
      "upper-lower-hypertrophy-4d",
      { en: "Moderate · Upper / Lower Hypertrophy", zh: "中量・上下肢增肌" },
      { en: `Four balanced days for muscle gain with two weekly exposures per muscle group. ${inclusiveNote.en}`, zh: `每週四日，各肌群每週刺激兩次的均衡增肌計畫。${inclusiveNote.zh}` },
      4, "hypertrophy", ["gain", "maintain"], "moderate",
      [
        day("ul-l1", "Lower · Quads", "下肢・股四頭", [ex("backSquat", 3, "6-8", 8, 3), ex("legPress", 3, "10-12", 8, 2), ex("legExt", 3, "12-15", 9, 1), ex("lyingLegCurl", 3, "10-12", 8, 1.5), ex("calfRaise", 3, "12", 8, 1)]),
        day("ul-u1", "Upper · Push", "上肢・推", [ex("bench", 3, "6-8", 8, 2.5), ex("latPulldown", 3, "8-10", 8, 2), ex("dbShoulderPress", 3, "10", 8, 1.5), ex("cableRow", 3, "10-12", 8, 1.5), ex("dbLateralRaise", 3, "15", 9, 1)]),
        day("ul-l2", "Lower · Glutes", "下肢・臀腿", [ex("rdl", 3, "8", 8, 2.5), ex("hipThrust", 4, "8-10", 8, 2), ex("bulgarianSplit", 3, "10/leg", 8, 1.5), ex("seatedLegCurl", 3, "12", 9, 1), ex("hipAbduction", 2, "15", 9, 1)]),
        day("ul-u2", "Upper · Pull", "上肢・拉", [ex("dbInclinePress", 3, "8-10", 8, 2), ex("csDbRow", 3, "8-10", 8, 2), ex("neutralPulldown", 3, "10", 8, 1.5), ex("cableFlye", 2, "12-15", 9, 1), ex("dbCurl", 3, "12", 9, 1), ex("tricepPressdown", 3, "12", 9, 1)]),
      ]
    ),
    libraryPlan(
      "powerbuilding-5d",
      { en: "Focused · Powerbuilding", zh: "專注・力量增肌" },
      { en: `Five days combining heavy barbell practice with hypertrophy accessories. ${inclusiveNote.en}`, zh: `每週五日，結合槓鈴力量與肌肥大輔助動作。${inclusiveNote.zh}` },
      5, "strength", ["gain", "maintain"], "focused",
      [
        day("pb-s", "Strength · Squat", "力量・深蹲", [ex("backSquat", 5, "4", 8, 3), ex("rdl", 3, "6", 8, 2.5), ex("legExt", 3, "12", 9, 1), ex("plank", 3, "40 sec", 8, 1)]),
        day("pb-b", "Strength · Bench", "力量・臥推", [ex("bench", 5, "4", 8, 3), ex("bbRow", 4, "6", 8, 2.5), ex("militaryPress", 3, "6", 8, 2), ex("tricepPressdown", 3, "10", 9, 1)]),
        day("pb-d", "Strength · Deadlift", "力量・硬舉", [ex("deadlift", 4, "3", 8, 3), ex("legPress", 3, "8", 8, 2), ex("lyingLegCurl", 3, "10", 9, 1), ex("calfRaise", 3, "12", 8, 1)]),
        day("pb-u", "Hypertrophy · Upper", "增肌・上肢", [ex("dbInclinePress", 4, "10", 8, 2), ex("latPulldown", 4, "10", 8, 2), ex("cableRow", 3, "12", 8, 1.5), ex("dbLateralRaise", 4, "15", 9, 1), ex("dbCurl", 3, "12", 9, 1)]),
        day("pb-l", "Hypertrophy · Lower", "增肌・下肢", [ex("gobletSquat", 4, "10", 8, 2), ex("hipThrust", 4, "10", 8, 2), ex("dbLunge", 3, "12/leg", 8, 1.5), ex("seatedLegCurl", 3, "12", 9, 1), ex("hipAbduction", 3, "15", 9, 1)]),
      ]
    ),
    libraryPlan(
      "lean-build-5d",
      { en: "Focused · Lean Mass", zh: "專注・精實增肌" },
      { en: `Five moderate-volume sessions for gaining muscle without marathon workouts. ${inclusiveNote.en}`, zh: `每週五次中等訓練量，在不拉長單次訓練的情況下增肌。${inclusiveNote.zh}` },
      5, "hypertrophy", ["gain"], "focused",
      [
        day("lm-p", "Push", "推", [ex("bench", 3, "8", 8, 2), ex("dbShoulderPress", 3, "10", 8, 1.5), ex("cableFlye", 3, "12", 9, 1), ex("dbLateralRaise", 3, "15", 9, 1), ex("tricepPressdown", 3, "12", 9, 1)]),
        day("lm-pu", "Pull", "拉", [ex("latPulldown", 3, "8-10", 8, 2), ex("csDbRow", 3, "10", 8, 2), ex("cableRow", 3, "12", 8, 1.5), ex("facePull", 3, "15", 9, 1), ex("dbCurl", 3, "12", 9, 1)]),
        day("lm-l", "Legs", "腿", [ex("backSquat", 3, "8", 8, 2.5), ex("rdl", 3, "10", 8, 2), ex("legPress", 3, "12", 8, 2), ex("lyingLegCurl", 3, "12", 9, 1), ex("calfRaise", 3, "15", 9, 1)]),
        day("lm-u", "Upper", "上肢", [ex("dbInclinePress", 3, "10", 8, 2), ex("neutralPulldown", 3, "10", 8, 2), ex("dbRow", 3, "10/arm", 8, 1.5), ex("dbLateralRaise", 3, "15", 9, 1), ex("hammerCurl", 2, "12", 9, 1)]),
        day("lm-g", "Glutes & Core", "臀腿與核心", [ex("hipThrust", 4, "8-10", 8, 2), ex("bulgarianSplit", 3, "10/leg", 8, 1.5), ex("hipAbduction", 3, "15", 9, 1), ex("hangingLegRaise", 3, "10", 8, 1), ex("plank", 3, "40 sec", 8, 1)]),
      ]
    ),
    libraryPlan(
      "ppl-mass-6d",
      { en: "Intense · Push / Pull / Legs Mass", zh: "高強度・推拉腿增肌" },
      { en: `Six high-frequency sessions for experienced lifters prioritizing mass gain. ${inclusiveNote.en}`, zh: `每週六日高頻率訓練，適合以增肌為主且已有經驗者。${inclusiveNote.zh}` },
      6, "hypertrophy", ["gain"], "intense",
      [
        day("pm-p1", "Push · Chest", "推・胸", [ex("bench", 4, "6-8", 8, 2.5), ex("dbInclinePress", 3, "10", 8, 2), ex("dbShoulderPress", 3, "10", 8, 1.5), ex("cableFlye", 3, "12", 9, 1), ex("tricepPressdown", 3, "12", 9, 1)]),
        day("pm-r1", "Pull · Back", "拉・背", [ex("assistedPullup", 4, "6-8", 8, 2), ex("csDbRow", 4, "8", 8, 2), ex("latPulldown", 3, "10", 8, 1.5), ex("facePull", 3, "15", 9, 1), ex("dbCurl", 3, "10", 9, 1)]),
        day("pm-l1", "Legs · Quads", "腿・股四頭", [ex("backSquat", 4, "6", 8, 3), ex("legPress", 4, "10", 8, 2), ex("dbLunge", 3, "10/leg", 8, 1.5), ex("legExt", 3, "15", 9, 1), ex("calfRaise", 4, "12", 9, 1)]),
        day("pm-p2", "Push · Shoulders", "推・肩", [ex("militaryPress", 4, "6-8", 8, 2.5), ex("dbInclinePress", 3, "10", 8, 2), ex("dbLateralRaise", 4, "15", 9, 1), ex("cableFlye", 3, "12", 9, 1), ex("ropeTricep", 3, "12", 9, 1)]),
        day("pm-r2", "Pull · Width", "拉・背寬", [ex("neutralPulldown", 4, "8", 8, 2), ex("cableRow", 4, "10", 8, 2), ex("dbRow", 3, "12/arm", 8, 1.5), ex("reversePecDeck", 3, "15", 9, 1), ex("hammerCurl", 3, "12", 9, 1)]),
        day("pm-l2", "Legs · Posterior", "腿・後鏈", [ex("deadlift", 3, "5", 8, 3), ex("hipThrust", 4, "8", 8, 2), ex("rdl", 3, "10", 8, 2), ex("seatedLegCurl", 3, "12", 9, 1), ex("hipAbduction", 3, "15", 9, 1)]),
      ]
    ),
    libraryPlan(
      "conditioning-cut-6d",
      { en: "Intense · Lean & Conditioned", zh: "高強度・減脂體能" },
      { en: `Six shorter resistance sessions to retain muscle during a fat-loss phase. Add low-impact cardio only as recovery allows. ${inclusiveNote.en}`, zh: `每週六次較短阻力訓練，在減脂期維持肌肉；恢復允許時再加入低衝擊有氧。${inclusiveNote.zh}` },
      6, "general", ["lose"], "intense",
      [
        day("cc-a", "Upper A", "上肢 A", [ex("bench", 3, "8", 7, 2), ex("latPulldown", 3, "10", 7, 1.5), ex("dbShoulderPress", 2, "10", 8, 1.5), ex("cableRow", 2, "12", 8, 1)]),
        day("cc-b", "Lower A", "下肢 A", [ex("gobletSquat", 3, "10", 7, 2), ex("rdl", 3, "10", 7, 2), ex("dbLunge", 2, "10/leg", 8, 1.5), ex("plank", 3, "30 sec", 7, 1)]),
        day("cc-c", "Upper B", "上肢 B", [ex("dbInclinePress", 3, "10", 8, 1.5), ex("assistedPullup", 3, "8", 8, 2), ex("dbLateralRaise", 3, "15", 8, 1), ex("facePull", 3, "15", 8, 1)]),
        day("cc-d", "Lower B", "下肢 B", [ex("legPress", 3, "12", 8, 2), ex("hipThrust", 3, "10", 8, 2), ex("lyingLegCurl", 3, "12", 8, 1), ex("bicycleCrunch", 3, "12/side", 8, 1)]),
        day("cc-e", "Upper C", "上肢 C", [ex("militaryPress", 3, "8", 8, 2), ex("dbRow", 3, "10/arm", 8, 1.5), ex("cableFlye", 2, "12", 8, 1), ex("tricepPressdown", 2, "12", 8, 1), ex("dbCurl", 2, "12", 8, 1)]),
        day("cc-f", "Lower C", "下肢 C", [ex("backSquat", 3, "6", 8, 2.5), ex("seatedLegCurl", 3, "10", 8, 1.5), ex("calfRaise", 3, "15", 8, 1), ex("hangingLegRaise", 3, "10", 8, 1)]),
      ]
    ),
  ];
}

export function buildAllPlans(): WorkoutPlan[] {
  return [buildBernardPlan(), buildGfPlan(), ...buildSuggestedPlans()];
}
