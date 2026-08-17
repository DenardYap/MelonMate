"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FriendsHub from "@/components/FriendsHub";

function FriendsPageContent() {
  const searchParams = useSearchParams();
  return <FriendsHub autoOpenShare={searchParams.get("share") === "daily"} />;
}

export default function FriendsPage() {
  return <Suspense fallback={null}><FriendsPageContent /></Suspense>;
}
