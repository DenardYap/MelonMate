import { afterEach, describe, expect, it } from "vitest";
import {
  NativeApiOriginMissingError,
  apiUrl,
  isNativeApiOriginMissingError,
  nativeApiUnavailableMessage,
} from "./api";

const originalOrigin = process.env.NEXT_PUBLIC_API_ORIGIN;
const originalCapacitorBuild = process.env.NEXT_PUBLIC_CAPACITOR_BUILD;

afterEach(() => {
  if (originalOrigin === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
  else process.env.NEXT_PUBLIC_API_ORIGIN = originalOrigin;

  if (originalCapacitorBuild === undefined) delete process.env.NEXT_PUBLIC_CAPACITOR_BUILD;
  else process.env.NEXT_PUBLIC_CAPACITOR_BUILD = originalCapacitorBuild;
});

describe("native API routing", () => {
  it("uses the configured hosted API origin", () => {
    process.env.NEXT_PUBLIC_API_ORIGIN = "https://api.example.com/";
    process.env.NEXT_PUBLIC_CAPACITOR_BUILD = "1";

    expect(apiUrl("api/food-text-estimate")).toBe("https://api.example.com/api/food-text-estimate");
  });

  it("throws a recognizable configuration error in an unconfigured native build", () => {
    delete process.env.NEXT_PUBLIC_API_ORIGIN;
    process.env.NEXT_PUBLIC_CAPACITOR_BUILD = "1";

    expect(() => apiUrl("/api/food-text-estimate")).toThrow(NativeApiOriginMissingError);

    try {
      apiUrl("/api/food-text-estimate");
    } catch (error) {
      expect(isNativeApiOriginMissingError(error)).toBe(true);
    }
  });

  it("provides Traditional Chinese native fallback copy without leaking the internal error", () => {
    const message = nativeApiUnavailableMessage("zh", "text");

    expect(message).toContain("原生版");
    expect(message).toContain("自訂");
    expect(message).not.toContain("native-api-origin-missing");
  });
});
