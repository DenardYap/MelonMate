import { describe, expect, it } from "vitest";
import { matchesTabRoute, staticTabHref } from "./tabNavigation";

describe("tab navigation", () => {
  it("matches a tab and its nested routes", () => {
    expect(matchesTabRoute("/gym", "/gym")).toBe(true);
    expect(matchesTabRoute("/gym/session", "/gym")).toBe(true);
    expect(matchesTabRoute("/gymnasium", "/gym")).toBe(false);
    expect(matchesTabRoute("/kitchen", "/")).toBe(false);
  });

  it("builds paths that resolve in the Capacitor static export", () => {
    expect(staticTabHref("/")).toBe("/");
    expect(staticTabHref("/kitchen")).toBe("/kitchen/");
    expect(staticTabHref("/kitchen/")).toBe("/kitchen/");
  });
});
