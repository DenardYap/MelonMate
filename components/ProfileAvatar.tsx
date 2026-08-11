"use client";

import Image from "next/image";
import { AppIcon } from "@/components/icons";
import { isProfilePhotoSource } from "@/lib/profilePhoto";

export default function ProfileAvatar({
  name,
  photoDataUrl,
  className,
  iconSize = 28,
  eager = false,
}: {
  name: string;
  photoDataUrl?: string;
  className: string;
  iconSize?: number;
  eager?: boolean;
}) {
  return (
    <div className={className}>
      {isProfilePhotoSource(photoDataUrl) ? (
        <Image
          src={photoDataUrl}
          alt={`${name} profile photo`}
          fill
          sizes="96px"
          loading={eager ? "eager" : "lazy"}
          unoptimized
          style={{ objectFit: "cover" }}
        />
      ) : (
        <AppIcon name="user" size={iconSize} />
      )}
    </div>
  );
}
