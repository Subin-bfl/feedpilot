"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // NextAuth's sign-out clears session/csrf cookies with the correct attributes.
        void signOut({ callbackUrl: `${window.location.origin}/login` });
      }}
    >
      Sign out
    </Button>
  );
}
