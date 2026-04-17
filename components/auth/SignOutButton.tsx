"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/auth/actions";

export default function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn-secondary"
      onClick={() => startTransition(() => void signOut())}
      disabled={isPending}
      style={{ fontSize: 10, padding: "6px 10px" }}
      aria-label="Sign out"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
