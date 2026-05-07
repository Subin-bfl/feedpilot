"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type FieldType = "string" | "url" | "price" | "number";
type FieldDef = { key: string; label: string; required?: boolean; type?: FieldType };
type Template = {
  id: string;
  name: string;
  channel: string;
  fields: FieldDef[];
};

export function TemplateCard({ template }: { template: Template }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [fields, setFields] = useState<FieldDef[]>(template.fields ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, patch: Partial<FieldDef>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, { key: "", label: "", type: "string", required: false }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const normalized = fields
        .map((f) => ({
          key: f.key.trim(),
          label: f.label.trim(),
          type: (f.type ?? "string") as FieldType,
          required: Boolean(f.required),
        }))
        .filter((f) => f.key && f.label);

      if (!name.trim()) throw new Error("Template name is required.");
      if (normalized.length === 0) throw new Error("Add at least one attribute.");

      const res = await fetch(`/api/channel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), fields: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update template");
      setFields(normalized);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{template.name}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{template.channel}</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing((x) => !x)}>
              {editing ? "Close" : "Edit"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{fields.length} fields</p>
        <div className="flex flex-wrap gap-2">
          {fields.map((f, idx) => (
            <Badge key={`${f.key}-${f.label}-${idx}`} variant={f.required ? "default" : "outline"}>
              {f.key || "(new)"}
            </Badge>
          ))}
        </div>

        {editing && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-2">
              <Label>Template name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {fields.map((f, idx) => (
              <div key={`${idx}-${f.key}-${f.label}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                <Input
                  placeholder="key"
                  value={f.key}
                  onChange={(e) => updateField(idx, { key: e.target.value })}
                />
                <Input
                  placeholder="label"
                  value={f.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                />
                <Select
                  value={f.type ?? "string"}
                  onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                >
                  <option value="string">string</option>
                  <option value="url">url</option>
                  <option value="price">price</option>
                  <option value="number">number</option>
                </Select>
                <Select
                  value={f.required ? "true" : "false"}
                  onChange={(e) => updateField(idx, { required: e.target.value === "true" })}
                >
                  <option value="false">optional</option>
                  <option value="true">required</option>
                </Select>
                <Button type="button" variant="destructive" onClick={() => removeField(idx)}>
                  Remove
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addField}>
                Add attribute
              </Button>
              <Button type="button" onClick={save} disabled={busy}>
                {busy ? "Saving..." : "Save template"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

