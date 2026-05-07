"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChannelField = {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
};

export type Mapping = {
  channelField: string;
  mode: "FIELD" | "STATIC" | "COMBINE" | "LOOKUP" | "EXTRACT" | "EMPTY";
  sourceField?: string | null;
  staticValue?: string | null;
  combineFields?: string[];
  separator?: string | null;
  lookupTable?: Array<{ from: string; to: string }>;
  extractPattern?: string | null;
  extractGroup?: number | null;
  valueEdits?: ValueEdit[];
};

type ValueEdit =
  | { type: "overwrite"; value?: string | null }
  | { type: "add_prefix"; value?: string | null }
  | { type: "add_suffix"; value?: string | null }
  | { type: "replace_single"; from?: string | null; to?: string | null }
  | { type: "replace_multiple"; pairs?: Array<{ from: string; to: string }> }
  | { type: "remove_single"; value?: string | null }
  | { type: "remove_multiple"; values?: string[] }
  | { type: "remove_duplicates" }
  | { type: "strip_html" }
  | { type: "recalculate"; formula?: string | null }
  | { type: "recapitalize"; mode?: "upper" | "lower" | "title" | null }
  | { type: "round"; decimals?: number | null };

type Props = {
  channelFeedId: string;
  fields: ChannelField[];
  sourceColumns: string[];
  initial: Mapping[];
};

export function FieldMapper({ channelFeedId, fields, sourceColumns, initial }: Props) {
  const router = useRouter();
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
        lookupTable: [],
        extractPattern: "",
        extractGroup: 1,
        valueEdits: [],
      };
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  function update(key: string, patch: Partial<Mapping>) {
    setMappings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function updateValueEdit(key: string, index: number, next: ValueEdit) {
    setMappings((prev) => {
      const edits = [...(prev[key].valueEdits ?? [])];
      edits[index] = next;
      return { ...prev, [key]: { ...prev[key], valueEdits: edits } };
    });
  }

  function removeValueEdit(key: string, index: number) {
    setMappings((prev) => {
      const edits = [...(prev[key].valueEdits ?? [])].filter((_, i) => i !== index);
      return { ...prev, [key]: { ...prev[key], valueEdits: edits } };
    });
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
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Field mapping</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Map each channel field to a source column, static value, or transform rule.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden border-b bg-white/60 px-5 py-2 text-xs font-medium text-muted-foreground md:block">
          <div className="grid grid-cols-[minmax(0,240px)_140px_minmax(0,1fr)_56px] items-center gap-3">
            <div>Channel field</div>
            <div>Mode</div>
            <div>Mapping</div>
            <div className="text-right">Edit</div>
          </div>
        </div>

        <div className="divide-y">
          {fields.map((f) => {
            const m = mappings[f.key];
            const isExpanded = expandedKey === f.key;
            return (
              <div key={f.key} className="px-5 py-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,240px)_140px_minmax(0,1fr)_56px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-[#111111]">{f.label}</span>
                      {f.required && <span className="text-destructive">*</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">{f.key}</div>
                  </div>

                  <div>
                    <div className="md:hidden">
                      <Label>Mode</Label>
                    </div>
                    <Select
                      value={m.mode}
                      onChange={(e) => update(f.key, { mode: e.target.value as Mapping["mode"] })}
                    >
                      <option value="FIELD">Use</option>
                      <option value="STATIC">Add static value</option>
                      <option value="COMBINE">Combine</option>
                      <option value="LOOKUP">Use lookup table</option>
                      <option value="EXTRACT">Extract from</option>
                      <option value="EMPTY">Leave empty</option>
                    </Select>
                  </div>

                  <div className="min-w-0">
                    {m.mode === "FIELD" && (
                      <div>
                        <div className="md:hidden">
                          <Label>Source field</Label>
                        </div>
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
                        <div className="md:hidden">
                          <Label>Static value</Label>
                        </div>
                        <Input
                          value={m.staticValue ?? ""}
                          onChange={(e) => update(f.key, { staticValue: e.target.value })}
                        />
                      </div>
                    )}
                    {m.mode === "COMBINE" && (
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-9">
                          <div className="md:hidden">
                            <Label>Fields</Label>
                          </div>
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
                          <div className="md:hidden">
                            <Label>Separator</Label>
                          </div>
                          <Input
                            value={m.separator ?? " "}
                            onChange={(e) => update(f.key, { separator: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    {m.mode === "LOOKUP" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                          <div>
                            <div className="md:hidden">
                              <Label>Source field</Label>
                            </div>
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
                          <div className="text-xs text-muted-foreground lg:self-center">
                            Enter one mapping per line: <span className="font-mono">from =&gt; to</span>
                          </div>
                        </div>
                        <Textarea
                          rows={4}
                          value={serializeLookupTable(m.lookupTable ?? [])}
                          onChange={(e) => update(f.key, { lookupTable: parseLookupTableInput(e.target.value) })}
                          placeholder={`in stock => available\nout of stock => unavailable`}
                        />
                      </div>
                    )}
                    {m.mode === "EXTRACT" && (
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
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
                        <div className="col-span-5">
                          <Input
                            value={m.extractPattern ?? ""}
                            onChange={(e) => update(f.key, { extractPattern: e.target.value })}
                            placeholder="([A-Z]{3})-\\d+"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            value={m.extractGroup ?? 1}
                            onChange={(e) =>
                              update(f.key, { extractGroup: parseInt(e.target.value || "1", 10) })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {m.mode === "EMPTY" && (
                      <p className="text-sm text-muted-foreground">
                        This mapped channel field will be intentionally left blank.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9"
                      onClick={() => setExpandedKey((k) => (k === f.key ? null : f.key))}
                      aria-label={isExpanded ? "Collapse edits" : "Edit mapping"}
                      title={isExpanded ? "Collapse" : "Edit"}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-md border border-[#f4c400]/25 bg-[#fffdf4] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[#111111]">Value edits</div>
                        <div className="text-xs text-muted-foreground">Apply transformations after mapping.</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update(f.key, {
                            valueEdits: [...(m.valueEdits ?? []), { type: "add_prefix", value: "" }],
                          })
                        }
                      >
                        Add edit
                      </Button>
                    </div>

                    {(m.valueEdits ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No edits configured yet.
                      </p>
                    )}

                    <div className="space-y-2">
                      {(m.valueEdits ?? []).map((edit, idx) => (
                        <div key={idx} className="rounded border bg-white p-3">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <Select
                              value={edit.type}
                              onChange={(e) =>
                                updateValueEdit(
                                  f.key,
                                  idx,
                                  resetValueEdit(e.target.value as ValueEdit["type"])
                                )
                              }
                            >
                              <option value="overwrite">Overwrite</option>
                              <option value="replace_single">Replace single value</option>
                              <option value="replace_multiple">Replace multiple values</option>
                              <option value="remove_single">Remove single value</option>
                              <option value="remove_multiple">Remove multiple values</option>
                              <option value="remove_duplicates">Remove duplicates</option>
                              <option value="strip_html">Strip HTML</option>
                              <option value="add_prefix">Add prefix</option>
                              <option value="add_suffix">Add suffix</option>
                              <option value="recalculate">Recalculate</option>
                              <option value="recapitalize">Recapitalize</option>
                              <option value="round">Round</option>
                            </Select>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeValueEdit(f.key, idx)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2">
                            {edit.type === "overwrite" && (
                              <Input
                                placeholder="Overwrite value"
                                value={edit.value ?? ""}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, { ...edit, value: e.target.value })
                                }
                              />
                            )}
                            {edit.type === "add_prefix" && (
                              <Input
                                placeholder="Prefix text"
                                value={edit.value ?? ""}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, { ...edit, value: e.target.value })
                                }
                              />
                            )}
                            {edit.type === "add_suffix" && (
                              <Input
                                placeholder="Suffix text"
                                value={edit.value ?? ""}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, { ...edit, value: e.target.value })
                                }
                              />
                            )}
                            {edit.type === "replace_single" && (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="From"
                                  value={edit.from ?? ""}
                                  onChange={(e) =>
                                    updateValueEdit(f.key, idx, { ...edit, from: e.target.value })
                                  }
                                />
                                <Input
                                  placeholder="To"
                                  value={edit.to ?? ""}
                                  onChange={(e) =>
                                    updateValueEdit(f.key, idx, { ...edit, to: e.target.value })
                                  }
                                />
                              </div>
                            )}
                            {edit.type === "replace_multiple" && (
                              <Textarea
                                rows={4}
                                placeholder={`old => new\nsmall => s\nlarge => l`}
                                value={serializeLookupTable(edit.pairs ?? [])}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, {
                                    ...edit,
                                    pairs: parseLookupTableInput(e.target.value),
                                  })
                                }
                              />
                            )}
                            {edit.type === "remove_single" && (
                              <Input
                                placeholder="Value/text to remove"
                                value={edit.value ?? ""}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, { ...edit, value: e.target.value })
                                }
                              />
                            )}
                            {edit.type === "remove_multiple" && (
                              <Textarea
                                rows={4}
                                placeholder={`remove_this\nand_this`}
                                value={(edit.values ?? []).join("\n")}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, {
                                    ...edit,
                                    values: e.target.value
                                      .split("\n")
                                      .map((v) => v.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            )}
                            {edit.type === "remove_duplicates" && (
                              <p className="text-xs text-muted-foreground">
                                Removes duplicate comma-separated values (keeps first occurrence).
                              </p>
                            )}
                            {edit.type === "strip_html" && (
                              <p className="text-xs text-muted-foreground">
                                Removes HTML tags and normalizes spacing.
                              </p>
                            )}
                            {edit.type === "recalculate" && (
                              <Input
                                placeholder="Formula using x, e.g. x*1.2 or (x+5)/2"
                                value={edit.formula ?? ""}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, { ...edit, formula: e.target.value })
                                }
                              />
                            )}
                            {edit.type === "recapitalize" && (
                              <Select
                                value={edit.mode ?? "title"}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, {
                                    ...edit,
                                    mode: e.target.value as "upper" | "lower" | "title",
                                  })
                                }
                              >
                                <option value="title">Title Case</option>
                                <option value="upper">UPPERCASE</option>
                                <option value="lower">lowercase</option>
                              </Select>
                            )}
                            {edit.type === "round" && (
                              <Input
                                type="number"
                                min={0}
                                max={6}
                                placeholder="Decimals"
                                value={edit.decimals ?? 0}
                                onChange={(e) =>
                                  updateValueEdit(f.key, idx, {
                                    ...edit,
                                    decimals: parseInt(e.target.value || "0", 10),
                                  })
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-white/80 px-5 py-3 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {savedAt && <span className="text-sm text-muted-foreground">Saved at {savedAt}</span>}
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
            {expandedKey && (
              <Button variant="outline" size="sm" onClick={() => setExpandedKey(null)}>
                Collapse editor
              </Button>
            )}
          </div>
        </div>

        {savedAt && (
          <div className="rounded-md border border-[#f4c400]/40 bg-[#fff7cc]/60 p-3">
            <p className="mb-2 text-sm font-medium text-[#111111]">
              Mapping saved. Next step: include/exclude products with conditions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/channel-feeds/${channelFeedId}/rules`)}
              >
                Set include/exclude conditions
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/channel-feeds/${channelFeedId}/preview`)}
              >
                Skip for now and preview
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseLookupTableInput(input: string): Array<{ from: string; to: string }> {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("=>");
      if (parts.length < 2) return null;
      const from = parts[0].trim();
      const to = parts.slice(1).join("=>").trim();
      if (!from) return null;
      return { from, to };
    })
    .filter((x): x is { from: string; to: string } => x !== null);
}

function serializeLookupTable(table: Array<{ from: string; to: string }>): string {
  return table.map((item) => `${item.from} => ${item.to}`).join("\n");
}

function resetValueEdit(type: ValueEdit["type"]): ValueEdit {
  switch (type) {
    case "overwrite":
      return { type, value: "" };
    case "add_prefix":
      return { type, value: "" };
    case "add_suffix":
      return { type, value: "" };
    case "replace_single":
      return { type, from: "", to: "" };
    case "replace_multiple":
      return { type, pairs: [] };
    case "remove_single":
      return { type, value: "" };
    case "remove_multiple":
      return { type, values: [] };
    case "remove_duplicates":
      return { type };
    case "strip_html":
      return { type };
    case "recalculate":
      return { type, formula: "x" };
    case "recapitalize":
      return { type, mode: "title" };
    case "round":
      return { type, decimals: 0 };
  }
}
