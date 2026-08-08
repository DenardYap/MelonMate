"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function QueryFriendProfile() {
  const params = useSearchParams();
  const router = useRouter();
  const friendId = params.get("id");
  useEffect(() => {
    router.replace(friendId ? `/friends/${encodeURIComponent(friendId)}` : "/me");
  }, [friendId, router]);
  return null;
}

export default function StaticFriendProfilePage() {
  return (
    <Suspense fallback={null}>
      <QueryFriendProfile />
    </Suspense>
  );
}
