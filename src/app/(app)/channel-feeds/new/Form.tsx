"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type SourceFeed = { id: string; name: string; productCount: number };
type Store = { id: string; name: string; sourceFeeds: SourceFeed[] };
type Template = { id: string; name: string; channel: string };

export function NewChannelFeedForm({
  stores,
  templates,
}: {
  stores: Store[];
  templates: Template[];
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const store = useMemo(() => stores.find((s) => s.id === storeId), [stores, storeId]);
  const [sourceFeedId, setSourceFeedId] = useState(store?.sourceFeeds[0]?.id ?? "");
  const tpl = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sourceFeedId) {
      setError("This store has no source feed yet — upload a CSV first.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/channel-feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        sourceFeedId,
        templateId,
        channel: tpl?.channel ?? "GOOGLE",
        name: name || `${tpl?.name ?? "Channel"} feed`,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      return;
    }
    const j = await res.json();
    router.push(`/channel-feeds/${j.id}/mapping`);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label>Store</Label>
        <Select
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value);
            const s = stores.find((x) => x.id === e.target.value);
            setSourceFeedId(s?.sourceFeeds[0]?.id ?? "");
          }}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Source feed</Label>
        <Select value={sourceFeedId} onChange={(e) => setSourceFeedId(e.target.value)}>
          {(store?.sourceFeeds ?? []).map((sf) => (
            <option key={sf.id} value={sf.id}>
              {sf.name} ({sf.productCount})
            </option>
          ))}
          {(store?.sourceFeeds ?? []).length === 0 && <option value="">— none —</option>}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Template</Label>
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.channel})
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Google Shopping — Spring 2026"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}
