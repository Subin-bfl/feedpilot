import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef } from "@/services/feedValidator";
import { jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);

    const latest = await prisma.feedValidationResult.findFirst({
      where: { channelFeedId: cf.id },
      orderBy: { createdAt: "desc" },
    });

    // If we don't have one yet, compute on the fly so the UI is never empty.
    if (!latest) {
      const fields = cf.template.fields as unknown as ChannelFieldDef[];
      const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
      const result = generateFeed(raw, cf.mappings, cf.rules, fields);
      return NextResponse.json({
        score: result.validation.score,
        errorCount: result.validation.errorCount,
        warningCount: result.validation.warningCount,
        issues: result.validation.issues,
        ephemeral: true,
      });
    }
    return NextResponse.json(latest);
  } catch (e) {
    return jsonError(e);
  }
}
