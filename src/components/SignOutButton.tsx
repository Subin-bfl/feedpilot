"use client";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // Use the server-side logout endpoint so prod/local behave consistently.
        window.location.assign("/api/logout");
      }}
    >
      Sign out
    </Button>
  );
}
