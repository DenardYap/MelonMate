import { beforeEach, describe, expect, it } from "vitest";
import { useCelebrationQueue } from "./celebrationQueue";

const nextMicrotask = () => Promise.resolve();

describe("celebration queue", () => {
  beforeEach(async () => {
    await nextMicrotask();
    useCelebrationQueue.setState({ active: null, waiting: [] });
  });

  it("shows level-up before an achievement requested in the same action", async () => {
    const queue = useCelebrationQueue.getState();
    queue.request({ key: "achievement:firstRoots", kind: "achievement", priority: 1 });
    queue.request({ key: "level-up:1", kind: "level-up", priority: 0 });

    await nextMicrotask();
    expect(useCelebrationQueue.getState().active?.key).toBe("level-up:1");
    expect(useCelebrationQueue.getState().waiting.map((item) => item.key)).toEqual(["achievement:firstRoots"]);

    useCelebrationQueue.getState().finish("level-up:1");
    await nextMicrotask();
    expect(useCelebrationQueue.getState().active?.key).toBe("achievement:firstRoots");
  });

  it("never interrupts a celebration that is already visible", async () => {
    useCelebrationQueue.getState().request({ key: "achievement:firstRoots", kind: "achievement", priority: 1 });
    await nextMicrotask();

    useCelebrationQueue.getState().request({ key: "level-up:1", kind: "level-up", priority: 0 });
    await nextMicrotask();
    expect(useCelebrationQueue.getState().active?.key).toBe("achievement:firstRoots");
    expect(useCelebrationQueue.getState().waiting.map((item) => item.key)).toEqual(["level-up:1"]);

    useCelebrationQueue.getState().finish("achievement:firstRoots");
    await nextMicrotask();
    expect(useCelebrationQueue.getState().active?.key).toBe("level-up:1");
  });

  it("deduplicates repeat requests and can cancel queued celebrations", async () => {
    const item = { key: "achievement:firstRoots", kind: "achievement" as const, priority: 1 };
    useCelebrationQueue.getState().request(item);
    useCelebrationQueue.getState().request(item);
    useCelebrationQueue.getState().cancel(item.key);

    await nextMicrotask();
    expect(useCelebrationQueue.getState()).toMatchObject({ active: null, waiting: [] });
  });
});
