import { prisma } from "@/lib/db";
import { applyMappings } from "./feedMapper";
import { applyRules, type RuleWithRelations } from "./ruleEngine";
import { validateFeed, type ChannelFieldDef, type ValidationReport } from "./feedValidator";
import { exportCSV, exportXML } from "./feedExporter";
import { computeHealth, type HealthScore } from "./feedHealthScore";

export type GenerationResult = {
  rows: Record<string, string>[];
  diffs: Array<{
    productIndex: number;
    excluded: boolean;
    appliedRules: string[];
    before: Record<string, string>;
    after: Record<string, string>;
  }>;
  validation: ValidationReport;
  health: HealthScore;
  productCount: number;
  excludedCount: number;
};

export async function loadChannelFeed(channelFeedId: string, organizationId: string) {
  const cf = await prisma.channelFeed.findFirst({
    where: { id: channelFeedId, store: { organizationId } },
    include: {
      store: true,
      sourceFeed: true,
      template: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  return cf;
}

export function generateFeed(
  rawProducts: Record<string, unknown>[],
  mappings: Parameters<typeof applyMappings>[1],
  rules: RuleWithRelations[],
  fields: ChannelFieldDef[]
): GenerationResult {
  const diffs: GenerationResult["diffs"] = [];
  const finalRows: Record<string, string>[] = [];
  let excludedCount = 0;

  rawProducts.forEach((source, i) => {
    const mapped = applyMappings(source, mappings);
    const before = { ...mapped };
    const result = applyRules(source, mapped, rules);

    diffs.push({
      productIndex: i,
      excluded: result.excluded,
      appliedRules: result.appliedRules,
      before,
      after: result.mapped,
    });

    if (!result.excluded) finalRows.push(result.mapped);
    else excludedCount += 1;
  });

  const validation = validateFeed(finalRows, fields);
  const health = computeHealth({
    validation,
    productCount: rawProducts.length,
    excludedCount,
    lastRunAt: new Date(),
  });

  return {
    rows: finalRows,
    diffs,
    validation,
    health,
    productCount: rawProducts.length,
    excludedCount,
  };
}

export function buildExports(
  rows: Record<string, string>[],
  fields: ChannelFieldDef[],
  meta: { title: string; link?: string }
) {
  return {
    csv: exportCSV(rows, fields),
    xml: exportXML(rows, fields, meta),
  };
}
