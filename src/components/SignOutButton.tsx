"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        // Ensure cookies are cleared, then hard-navigate.
        // Some hosted environments can fail the client signOut call (CSRF/origin mismatches).
        // Provide a server-side fallback that still clears the session.
        try {
          const res = await signOut({ redirect: false, callbackUrl: "/login" });
          window.location.assign(res?.url ?? "/login");
        } catch {
          window.location.assign("/api/auth/signout?callbackUrl=/login");
        }
      }}
    >
      Sign out
    </Button>
  );
}
