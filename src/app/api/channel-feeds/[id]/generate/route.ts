import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef } from "@/services/feedValidator";
import { jsonError } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);

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

    return NextResponse.json({
      validationId: validation.id,
      health: result.health,
      productCount: result.productCount,
      excludedCount: result.excludedCount,
      score: result.validation.score,
    });
  } catch (e) {
    return jsonError(e);
  }
}
