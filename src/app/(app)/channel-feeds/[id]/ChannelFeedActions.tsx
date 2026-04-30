"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChannelFeedActions({ channelFeedId }: { channelFeedId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function generate() {
    setBusy("generate");
    try {
      await fetch(`/api/channel-feeds/${channelFeedId}/generate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy("duplicate");
    try {
      const res = await fetch(`/api/channel-feeds/${channelFeedId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const j = await res.json();
        router.push(`/channel-feeds/${j.id}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={duplicate} disabled={busy !== null}>
        {busy === "duplicate" ? "…" : "Duplicate"}
      </Button>
      <Button onClick={generate} disabled={busy !== null}>
        {busy === "generate" ? "Generating…" : "Generate now"}
      </Button>
      <a href={`/api/channel-feeds/${channelFeedId}/export.csv`}>
        <Button variant="secondary">Export CSV</Button>
      </a>
      <a href={`/api/channel-feeds/${channelFeedId}/export.xml`}>
        <Button variant="secondary">Export XML</Button>
      </a>
    </div>
  );
}
