"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChannelFeedDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this channel feed?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/channel-feeds/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={onDelete}
      disabled={busy}
      className="z-10"
    >
      {busy ? "Deleting..." : "Delete"}
    </Button>
  );
}

