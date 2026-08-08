import { describe, expect, test } from "vitest";
import {
  addDays,
  dateStr,
  diffDays,
  fmtDate,
  parseDate,
  weekDates,
  weekdayLabel,
} from "../lib/dates";

describe("dates", () => {
  test("dateStr / parseDate roundtrip", () => {
    expect(dateStr(parseDate("2026-08-07"))).toBe("2026-08-07");
    expect(dateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("diffDays", () => {
    expect(diffDays("2026-08-07", "2026-08-01")).toBe(6);
    expect(diffDays("2026-08-01", "2026-08-07")).toBe(-6);
    expect(diffDays("2026-08-07", "2026-08-07")).toBe(0);
  });

  test("weekDates starts Monday and holds 7 consecutive days", () => {
    const w = weekDates("2026-08-07"); // a Friday
    expect(w).toHaveLength(7);
    expect(w[0]).toBe("2026-08-03"); // Monday
    expect(w).toContain("2026-08-07");
    expect(w[6]).toBe("2026-08-09"); // Sunday
    // anchoring on a Monday returns the same week
    expect(weekDates("2026-08-03")[0]).toBe("2026-08-03");
  });

  test("weekday labels are bilingual", () => {
    expect(weekdayLabel("2026-08-07", "en")).toBe("Fri");
    expect(weekdayLabel("2026-08-07", "zh")).toBe("週五");
  });

  test("fmtDate localizes", () => {
    expect(fmtDate("2026-08-07", "zh")).toBe("8月7日");
    expect(fmtDate("2026-08-07", "en")).toMatch(/Aug 7/);
  });
});
