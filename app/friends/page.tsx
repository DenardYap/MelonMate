"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FriendProfile } from "./[id]/page";

function QueryFriendProfile() {
  const params = useSearchParams();
  const router = useRouter();
  const friendId = params.get("id");
  useEffect(() => {
    if (!friendId) router.replace("/me");
  }, [friendId, router]);
  return friendId ? <FriendProfile friendId={friendId} /> : null;
}

export default function StaticFriendProfilePage() {
  return (
    <Suspense fallback={null}>
      <QueryFriendProfile />
    </Suspense>
  );
}
