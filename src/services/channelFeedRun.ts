import { prisma } from "@/lib/db";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef } from "@/services/feedValidator";

export async function runChannelFeedGeneration(channelFeedId: string) {
  const cf = await prisma.channelFeed.findUnique({
    where: { id: channelFeedId },
    include: {
      sourceFeed: true,
      template: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  if (!cf) throw new Error("Channel feed not found");

  const fields = cf.template.fields as unknown as ChannelFieldDef[];
  const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
  const result = generateFeed(raw, cf.mappings, cf.rules, fields);

  const validation = await prisma.feedValidationResult.create({
    data: {
      channelFeedId: cf.id,
      score: result.validation.score,
      errorCount: result.validation.errorCount,
      warningCount: result.validation.warningCount,
      issues: result.validation.issues as object[],
    },
  });

  await prisma.channelFeed.update({
    where: { id: cf.id },
    data: { lastRunAt: new Date(), lastScore: result.health.score },
  });

  return {
    validationId: validation.id,
    health: result.health,
    productCount: result.productCount,
    excludedCount: result.excludedCount,
    score: result.validation.score,
  };
}

