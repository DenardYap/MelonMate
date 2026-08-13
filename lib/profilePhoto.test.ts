import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PROFILE_AVATARS,
  isBuiltInProfileAvatarUnlocked,
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

  it("keeps four starter avatars and level-gates every later block chronologically", () => {
    expect(BUILT_IN_PROFILE_AVATARS.filter((avatar) => avatar.unlockLevel === 1)).toHaveLength(4);
    expect(BUILT_IN_PROFILE_AVATARS.slice(4, 10).every((avatar) => avatar.unlockLevel === 3)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS.slice(10, 14).every((avatar) => avatar.unlockLevel === 4)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS.slice(14, 18).every((avatar) => avatar.unlockLevel === 5)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS.slice(18, 22).every((avatar) => avatar.unlockLevel === 6)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS.slice(22, 26).every((avatar) => avatar.unlockLevel === 7)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS.slice(26, 30).every((avatar) => avatar.unlockLevel === 8)).toBe(true);
    expect(BUILT_IN_PROFILE_AVATARS[30].unlockLevel).toBe(10);
    expect(BUILT_IN_PROFILE_AVATARS[31].unlockLevel).toBe(12);
    expect(BUILT_IN_PROFILE_AVATARS.every((avatar, index, avatars) => index === 0 || avatar.unlockLevel >= avatars[index - 1].unlockLevel)).toBe(true);

    const unicorn = BUILT_IN_PROFILE_AVATARS.find((avatar) => avatar.id === "melon-cloud-unicorn")!;
    expect(isBuiltInProfileAvatarUnlocked(unicorn, 11)).toBe(false);
    expect(isBuiltInProfileAvatarUnlocked(unicorn, 12)).toBe(true);
  });
});
