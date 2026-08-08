"use client";

import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/** Save/share a backup with the native iOS sheet. Returns false on the web. */
export async function shareNativeBackup(
  filename: string,
  json: string,
  title: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const file = await Filesystem.writeFile({
    path: filename,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  await Share.share({
    title,
    url: file.uri,
    dialogTitle: title,
  });
  return true;
}
