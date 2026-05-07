"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        // In some hosted setups the NextAuth redirect can be swallowed by the app router.
        // Force a hard navigation after sign-out so cookies/session are cleared reliably.
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
    >
      Sign out
    </Button>
  );
}
