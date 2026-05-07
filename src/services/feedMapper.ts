import type { FieldMapping } from "@prisma/client";

export type SourceRow = Record<string, unknown>;
export type MappedRow = Record<string, string>;
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

/**
 * Apply a list of FieldMapping records to a single source row, producing
 * the transformed row keyed by channel field names.
 */
export function applyMappings(row: SourceRow, mappings: FieldMapping[]): MappedRow {
  const out: MappedRow = {};
  for (const m of mappings) {
    let value = "";
    const sourceValue = m.sourceField && row[m.sourceField] != null ? String(row[m.sourceField] ?? "") : "";
    switch (m.mode) {
      case "FIELD":
        value = sourceValue;
        break;
      case "STATIC":
        value = m.staticValue ?? "";
        break;
      case "COMBINE": {
        const sep = m.separator ?? " ";
        value = (m.combineFields ?? [])
          .map((f) => (row[f] != null ? String(row[f]) : ""))
          .filter((v) => v.length > 0)
          .join(sep);
        break;
      }
      case "LOOKUP": {
        const table = parseLookupTable(m.lookupTable);
        value = table.get(sourceValue) ?? "";
        break;
      }
      case "EXTRACT": {
        value = extractByPattern(sourceValue, m.extractPattern ?? "", m.extractGroup ?? 1);
        break;
      }
      case "EMPTY":
        value = "";
        break;
    }
    value = applyValueEdits(value, m.valueEdits);
    out[m.channelField] = value;
  }
  return out;
}

export function applyMappingsBatch(rows: SourceRow[], mappings: FieldMapping[]): MappedRow[] {
  return rows.map((r) => applyMappings(r, mappings));
}

function parseLookupTable(input: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (!Array.isArray(input)) return out;
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const from = String((item as { from?: unknown }).from ?? "").trim();
    const to = String((item as { to?: unknown }).to ?? "");
    if (from.length === 0) continue;
    out.set(from, to);
  }
  return out;
}

function extractByPattern(value: string, pattern: string, group: number): string {
  if (!pattern || !value) return "";
  try {
    const rx = new RegExp(pattern);
    const match = value.match(rx);
    if (!match) return "";
    if (Number.isInteger(group) && group >= 0 && group < match.length) {
      return match[group] ?? "";
    }
    return match[1] ?? match[0] ?? "";
  } catch {
    return "";
  }
}

function applyValueEdits(value: string, input: unknown): string {
  if (!Array.isArray(input)) return value;
  let out = value ?? "";
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const edit = raw as ValueEdit;
    switch (edit.type) {
      case "overwrite":
        out = String(edit.value ?? "");
        break;
      case "add_prefix":
        out = `${edit.value ?? ""}${out}`;
        break;
      case "add_suffix":
        out = `${out}${edit.value ?? ""}`;
        break;
      case "replace_single": {
        const from = edit.from ?? "";
        if (!from) break;
        out = out.split(from).join(edit.to ?? "");
        break;
      }
      case "replace_multiple": {
        const pairs = Array.isArray(edit.pairs) ? edit.pairs : [];
        for (const pair of pairs) {
          const from = pair?.from ?? "";
          if (!from) continue;
          out = out.split(from).join(pair?.to ?? "");
        }
        break;
      }
      case "remove_single": {
        const token = edit.value ?? "";
        if (!token) break;
        out = out.split(token).join("");
        break;
      }
      case "remove_multiple": {
        const values = Array.isArray(edit.values) ? edit.values : [];
        for (const token of values) {
          if (!token) continue;
          out = out.split(token).join("");
        }
        break;
      }
      case "remove_duplicates": {
        const tokens = out
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        out = Array.from(new Set(tokens)).join(", ");
        break;
      }
      case "strip_html":
        out = out.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        break;
      case "recalculate":
        out = recalculateValue(out, edit.formula ?? "");
        break;
      case "recapitalize":
        out = recapitalizeValue(out, edit.mode ?? "title");
        break;
      case "round":
        out = roundValue(out, edit.decimals ?? 0);
        break;
    }
  }
  return out;
}

function recalculateValue(current: string, formula: string): string {
  const x = parseFloat(current);
  if (!Number.isFinite(x) || !formula.trim()) return current;
  try {
    // Limited expression support using x and arithmetic operators only.
    if (!/^[0-9xX+\-*/().\s]+$/.test(formula)) return current;
    const expr = formula.replaceAll("X", "x");
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `return (${expr});`) as (x: number) => number;
    const result = fn(x);
    return Number.isFinite(result) ? String(result) : current;
  } catch {
    return current;
  }
}

function recapitalizeValue(value: string, mode: "upper" | "lower" | "title"): string {
  if (mode === "upper") return value.toUpperCase();
  if (mode === "lower") return value.toLowerCase();
  return value
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1)}` : w))
    .join(" ");
}

function roundValue(value: string, decimals: number): string {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return value;
  const d = Math.max(0, Math.min(6, decimals));
  return n.toFixed(d);
}
