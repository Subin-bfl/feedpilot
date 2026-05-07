"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChannelFeedActions({
  channelFeedId,
  publicToken,
}: {
  channelFeedId: string;
  publicToken: string;
}) {
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

  async function remove() {
    if (!confirm("Delete this channel feed?")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/channel-feeds/${channelFeedId}`, { method: "DELETE" });
      if (res.ok) router.push("/channel-feeds");
    } finally {
      setBusy(null);
    }
  }

  async function copyXmlUrl() {
    const url = `${window.location.origin}/api/public/channel-feeds/${publicToken}/feed.xml`;
    await navigator.clipboard.writeText(url);
    setBusy("copied");
    setTimeout(() => setBusy(null), 1200);
  }

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
      <Button size="sm" variant="outline" onClick={copyXmlUrl} disabled={busy !== null}>
        {busy === "copied" ? "Copied XML URL" : "Copy XML URL"}
      </Button>
      <Button size="sm" variant="outline" onClick={duplicate} disabled={busy !== null}>
        {busy === "duplicate" ? "…" : "Duplicate"}
      </Button>
      <Button size="sm" onClick={generate} disabled={busy !== null}>
        {busy === "generate" ? "Generating…" : "Generate now"}
      </Button>
      <a href={`/api/channel-feeds/${channelFeedId}/export.csv`}>
        <Button size="sm" variant="secondary">
          Export CSV
        </Button>
      </a>
      <a href={`/api/channel-feeds/${channelFeedId}/export.xml`}>
        <Button size="sm" variant="secondary">
          Export XML
        </Button>
      </a>
      <Button size="sm" variant="destructive" onClick={remove} disabled={busy !== null}>
        {busy === "delete" ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
