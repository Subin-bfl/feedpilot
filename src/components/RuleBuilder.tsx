"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

type Operator =
  | "equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "regex";

type ActionType =
  | "set_value"
  | "append_text"
  | "prepend_text"
  | "replace"
  | "include_product"
  | "exclude_product"
  | "assign_custom_label";

type Condition = { field: string; operator: Operator; value?: string | null };
type Action = {
  type: ActionType;
  field?: string | null;
  value?: string | null;
  search?: string | null;
};
export type Rule = {
  name: string;
  enabled: boolean;
  priority: number;
  conditions: Condition[];
  actions: Action[];
};

type Props = {
  channelFeedId: string;
  channelFields: string[];
  sourceColumns: string[];
  initial: Rule[];
};

const OPERATORS: Operator[] = ["equals", "contains", "greater_than", "less_than", "is_empty", "regex"];
const ACTION_TYPES: ActionType[] = [
  "set_value",
  "append_text",
  "prepend_text",
  "replace",
  "include_product",
  "exclude_product",
  "assign_custom_label",
];

function emptyRule(): Rule {
  return {
    name: "New rule",
    enabled: true,
    priority: 0,
    conditions: [{ field: "", operator: "equals", value: "" }],
    actions: [{ type: "set_value", field: "", value: "" }],
  };
}

function emptyExcludeRule(): Rule {
  return {
    name: "Exclude by condition",
    enabled: true,
    priority: 0,
    conditions: [{ field: "", operator: "equals", value: "" }],
    actions: [{ type: "exclude_product" }],
  };
}

function emptyIncludeRule(): Rule {
  return {
    name: "Include by condition",
    enabled: true,
    priority: 0,
    conditions: [{ field: "", operator: "equals", value: "" }],
    actions: [{ type: "include_product" }],
  };
}

export function RuleBuilder({ channelFeedId, channelFields, sourceColumns, initial }: Props) {
  const [rules, setRules] = useState<Rule[]>(initial.length ? initial : []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allFields = Array.from(new Set([...channelFields, ...sourceColumns]));

  function patchRule(idx: number, patch: Partial<Rule>) {
    setRules((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function patchCondition(ri: number, ci: number, patch: Partial<Condition>) {
    setRules((rs) =>
      rs.map((r, i) =>
        i === ri
          ? { ...r, conditions: r.conditions.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
          : r
      )
    );
  }
  function patchAction(ri: number, ai: number, patch: Partial<Action>) {
    setRules((rs) =>
      rs.map((r, i) =>
        i === ri
          ? { ...r, actions: r.actions.map((a, j) => (j === ai ? { ...a, ...patch } : a)) }
          : r
      )
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/channel-feeds/${channelFeedId}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
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
        <CardTitle className="flex items-center justify-between">
          <span>Rules ({rules.length})</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRules((rs) => [...rs, emptyIncludeRule()])}
            >
              <Plus className="h-4 w-4" /> Include rule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRules((rs) => [...rs, emptyExcludeRule()])}
            >
              <Plus className="h-4 w-4" /> Exclude rule
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRules((rs) => [...rs, emptyRule()])}>
              <Plus className="h-4 w-4" /> New rule
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-[#f4c400]/40 bg-[#fff7cc]/60 p-3 text-sm text-[#111111]">
          Set conditions using source/channel fields, then use{" "}
          <span className="font-semibold">include_product</span> or{" "}
          <span className="font-semibold">exclude_product</span> to control which products are in
          the channel feed.
        </div>
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No rules yet. Click &quot;New rule&quot; to add one.</p>
        )}
        {rules.map((rule, ri) => (
          <div key={ri} className="rounded-md border bg-muted/20 p-4">
            <div className="mb-4 grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <Label>Name</Label>
                <Input value={rule.name} onChange={(e) => patchRule(ri, { name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={rule.priority}
                  onChange={(e) => patchRule(ri, { priority: parseInt(e.target.value || "0", 10) })}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-6">
                <input
                  id={`enabled-${ri}`}
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => patchRule(ri, { enabled: e.target.checked })}
                />
                <Label htmlFor={`enabled-${ri}`}>Enabled</Label>
              </div>
              <div className="col-span-2 flex items-end justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRules((rs) => rs.filter((_, i) => i !== ri))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <Label>IF (all conditions match)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patchRule(ri, {
                      conditions: [...rule.conditions, { field: "", operator: "equals", value: "" }],
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Condition
                </Button>
              </div>
              <div className="space-y-2">
                {rule.conditions.map((c, ci) => (
                  <div key={ci} className="grid grid-cols-12 gap-2">
                    <Select
                      className="col-span-4"
                      value={c.field}
                      onChange={(e) => patchCondition(ri, ci, { field: e.target.value })}
                    >
                      <option value="">— field —</option>
                      {allFields.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </Select>
                    <Select
                      className="col-span-3"
                      value={c.operator}
                      onChange={(e) => patchCondition(ri, ci, { operator: e.target.value as Operator })}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </Select>
                    {c.operator !== "is_empty" && (
                      <Input
                        className="col-span-4"
                        value={c.value ?? ""}
                        onChange={(e) => patchCondition(ri, ci, { value: e.target.value })}
                        placeholder="value"
                      />
                    )}
                    <Button
                      className="col-span-1"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        patchRule(ri, {
                          conditions: rule.conditions.filter((_, j) => j !== ci),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>THEN</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patchRule(ri, {
                      actions: [...rule.actions, { type: "set_value", field: "", value: "" }],
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Action
                </Button>
              </div>
              <div className="space-y-2">
                {rule.actions.map((a, ai) => (
                  <div key={ai} className="grid grid-cols-12 gap-2">
                    <Select
                      className="col-span-3"
                      value={a.type}
                      onChange={(e) => patchAction(ri, ai, { type: e.target.value as ActionType })}
                    >
                      {ACTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    {a.type !== "exclude_product" && a.type !== "include_product" && (
                      <Select
                        className="col-span-3"
                        value={a.field ?? ""}
                        onChange={(e) => patchAction(ri, ai, { field: e.target.value })}
                      >
                        <option value="">— field —</option>
                        {channelFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </Select>
                    )}
                    {a.type === "replace" && (
                      <Input
                        className="col-span-2"
                        value={a.search ?? ""}
                        onChange={(e) => patchAction(ri, ai, { search: e.target.value })}
                        placeholder="search"
                      />
                    )}
                    {a.type !== "exclude_product" && a.type !== "include_product" && (
                      <Input
                        className={a.type === "replace" ? "col-span-3" : "col-span-5"}
                        value={a.value ?? ""}
                        onChange={(e) => patchAction(ri, ai, { value: e.target.value })}
                        placeholder="value"
                      />
                    )}
                    <Button
                      className="col-span-1"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        patchRule(ri, {
                          actions: rule.actions.filter((_, j) => j !== ai),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save rules"}
          </Button>
          {savedAt && <span className="text-sm text-muted-foreground">Saved at {savedAt}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
