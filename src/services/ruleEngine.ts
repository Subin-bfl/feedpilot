import type { FeedRule, RuleAction, RuleCondition } from "@prisma/client";
import type { MappedRow, SourceRow } from "./feedMapper";

export type RuleWithRelations = FeedRule & {
  conditions: RuleCondition[];
  actions: RuleAction[];
};

export type RuleContext = {
  /** Original (parsed-source) row, used by condition evaluation. */
  source: SourceRow;
  /** Currently mapped row — actions modify this. */
  mapped: MappedRow;
};

/** Result of running rules over a single product. */
export type RuleResult = {
  excluded: boolean;
  mapped: MappedRow;
  appliedRules: string[]; // rule ids
};

function asString(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function evaluateCondition(c: RuleCondition, ctx: RuleContext): boolean {
  // Conditions read from the *combined* view: source first, then mapped.
  const fromMapped = ctx.mapped[c.field];
  const fromSource = (ctx.source as Record<string, unknown>)[c.field];
  const raw = fromMapped !== undefined ? fromMapped : fromSource;
  const a = asString(raw);

  switch (c.operator) {
    case "equals":
      return a === asString(c.value);
    case "contains":
      return a.toLowerCase().includes(asString(c.value).toLowerCase());
    case "greater_than": {
      const an = parseFloat(a);
      const bn = parseFloat(asString(c.value));
      return Number.isFinite(an) && Number.isFinite(bn) && an > bn;
    }
    case "less_than": {
      const an = parseFloat(a);
      const bn = parseFloat(asString(c.value));
      return Number.isFinite(an) && Number.isFinite(bn) && an < bn;
    }
    case "is_empty":
      return a.trim().length === 0;
    case "regex": {
      try {
        return new RegExp(asString(c.value)).test(a);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function applyAction(a: RuleAction, ctx: RuleContext): { excluded?: boolean } {
  switch (a.type) {
    case "set_value":
      if (a.field) ctx.mapped[a.field] = asString(a.value);
      return {};
    case "append_text":
      if (a.field) ctx.mapped[a.field] = asString(ctx.mapped[a.field]) + asString(a.value);
      return {};
    case "prepend_text":
      if (a.field) ctx.mapped[a.field] = asString(a.value) + asString(ctx.mapped[a.field]);
      return {};
    case "replace":
      if (a.field) {
        const search = asString(a.search);
        const replacement = asString(a.value);
        ctx.mapped[a.field] = asString(ctx.mapped[a.field]).split(search).join(replacement);
      }
      return {};
    case "exclude_product":
      return { excluded: true };
    case "assign_custom_label":
      if (a.field) ctx.mapped[a.field] = asString(a.value);
      return {};
    default:
      return {};
  }
}

export function applyRules(
  source: SourceRow,
  mapped: MappedRow,
  rules: RuleWithRelations[]
): RuleResult {
  const ctx: RuleContext = { source, mapped: { ...mapped } };
  const appliedRules: string[] = [];
  let excluded = false;

  // Sort by priority asc (low first), enabled only.
  const ordered = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of ordered) {
    const matches = rule.conditions.length === 0
      ? true
      : rule.conditions.every((c) => evaluateCondition(c, ctx));
    if (!matches) continue;

    appliedRules.push(rule.id);
    for (const action of rule.actions) {
      const r = applyAction(action, ctx);
      if (r.excluded) excluded = true;
    }
    if (excluded) break;
  }

  return { excluded, mapped: ctx.mapped, appliedRules };
}
