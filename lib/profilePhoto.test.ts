import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PROFILE_AVATARS,
  isProfilePhotoDataUrl,
  isProfilePhotoSource,
} from "./profilePhoto";

describe("profile photo sources", () => {
  it("exposes 32 unique safe built-in SVG avatars", () => {
    expect(BUILT_IN_PROFILE_AVATARS).toHaveLength(32);
    expect(new Set(BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.id))).toHaveProperty("size", 32);
    expect(new Set(BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.src))).toHaveProperty("size", 32);
    expect(BUILT_IN_PROFILE_AVATARS.every((avatar) => isProfilePhotoSource(avatar.src))).toBe(true);
  });

  it("accepts compact raster uploads and rejects untrusted URLs", () => {
    const uploaded = "data:image/jpeg;base64,cHJvZmlsZS1waG90bw==";
    expect(isProfilePhotoDataUrl(uploaded)).toBe(true);
    expect(isProfilePhotoSource(uploaded)).toBe(true);
    expect(isProfilePhotoSource("https://example.com/avatar.svg")).toBe(false);
    expect(isProfilePhotoSource("/avatars/not-in-the-collection.svg")).toBe(false);
  });
});
