import type { FieldMapping } from "@prisma/client";

export type SourceRow = Record<string, unknown>;
export type MappedRow = Record<string, string>;

/**
 * Apply a list of FieldMapping records to a single source row, producing
 * the transformed row keyed by channel field names.
 */
export function applyMappings(row: SourceRow, mappings: FieldMapping[]): MappedRow {
  const out: MappedRow = {};
  for (const m of mappings) {
    let value = "";
    switch (m.mode) {
      case "FIELD":
        if (m.sourceField && row[m.sourceField] != null) {
          value = String(row[m.sourceField] ?? "");
        }
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
    }
    out[m.channelField] = value;
  }
  return out;
}

export function applyMappingsBatch(rows: SourceRow[], mappings: FieldMapping[]): MappedRow[] {
  return rows.map((r) => applyMappings(r, mappings));
}
