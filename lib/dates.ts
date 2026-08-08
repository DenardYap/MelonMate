/** Local date as YYYY-MM-DD */
export function todayStr(): string {
  return dateStr(new Date());
}

export function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}

/** Monday-start week containing the given date */
export function weekDates(anchor: string): string[] {
  const d = parseDate(anchor);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return dateStr(x);
  });
}

const WD_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WD_ZH = ["一", "二", "三", "四", "五", "六", "日"];

export function weekdayLabel(s: string, lang: "en" | "zh"): string {
  const idx = (parseDate(s).getDay() + 6) % 7;
  return lang === "zh" ? `週${WD_ZH[idx]}` : WD_EN[idx];
}

export function fmtDate(s: string, lang: "en" | "zh"): string {
  const d = parseDate(s);
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtDateLong(s: string, lang: "en" | "zh"): string {
  const d = parseDate(s);
  if (lang === "zh")
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdayLabel(s, "zh")}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function fmtDuration(ms: number, lang: "en" | "zh"): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return lang === "zh" ? `${min} 分鐘` : `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return lang === "zh" ? `${h} 小時 ${m} 分` : `${h}h ${m}m`;
}
