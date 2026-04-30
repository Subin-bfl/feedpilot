"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChannelField = {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
};

export type Mapping = {
  channelField: string;
  mode: "FIELD" | "STATIC" | "COMBINE";
  sourceField?: string | null;
  staticValue?: string | null;
  combineFields?: string[];
  separator?: string | null;
};

type Props = {
  channelFeedId: string;
  fields: ChannelField[];
  sourceColumns: string[];
  initial: Mapping[];
};

export function FieldMapper({ channelFeedId, fields, sourceColumns, initial }: Props) {
  const [mappings, setMappings] = useState<Record<string, Mapping>>(() => {
    const map: Record<string, Mapping> = {};
    for (const f of fields) {
      const found = initial.find((m) => m.channelField === f.key);
      map[f.key] = found ?? {
        channelField: f.key,
        mode: "FIELD",
        sourceField: "",
        staticValue: "",
        combineFields: [],
        separator: " ",
      };
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, patch: Partial<Mapping>) {
    setMappings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/channel-feeds/${channelFeedId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: Object.values(mappings) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field mapping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f) => {
          const m = mappings[f.key];
          return (
            <div
              key={f.key}
              className="grid grid-cols-1 items-end gap-3 border-b pb-4 last:border-b-0 md:grid-cols-12"
            >
              <div className="md:col-span-3">
                <Label className="text-xs uppercase text-muted-foreground">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                <p className="font-mono text-sm">{f.key}</p>
              </div>
              <div className="md:col-span-2">
                <Label>Mode</Label>
                <Select
                  value={m.mode}
                  onChange={(e) => update(f.key, { mode: e.target.value as Mapping["mode"] })}
                >
                  <option value="FIELD">Source field</option>
                  <option value="STATIC">Static value</option>
                  <option value="COMBINE">Combine fields</option>
                </Select>
              </div>
              <div className="md:col-span-7">
                {m.mode === "FIELD" && (
                  <div>
                    <Label>Source field</Label>
                    <Select
                      value={m.sourceField ?? ""}
                      onChange={(e) => update(f.key, { sourceField: e.target.value })}
                    >
                      <option value="">— choose —</option>
                      {sourceColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {m.mode === "STATIC" && (
                  <div>
                    <Label>Static value</Label>
                    <Input
                      value={m.staticValue ?? ""}
                      onChange={(e) => update(f.key, { staticValue: e.target.value })}
                    />
                  </div>
                )}
                {m.mode === "COMBINE" && (
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-9">
                      <Label>Fields (comma-separated)</Label>
                      <Input
                        value={(m.combineFields ?? []).join(", ")}
                        onChange={(e) =>
                          update(f.key, {
                            combineFields: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="brand, product_name"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Separator</Label>
                      <Input
                        value={m.separator ?? " "}
                        onChange={(e) => update(f.key, { separator: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save mapping"}
          </Button>
          {savedAt && <span className="text-sm text-muted-foreground">Saved at {savedAt}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
