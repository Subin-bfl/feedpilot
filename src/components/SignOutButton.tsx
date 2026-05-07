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
        const res = await signOut({ redirect: false, callbackUrl: "/login" });
        window.location.assign(res?.url ?? "/login");
      }}
    >
      Sign out
    </Button>
  );
}
