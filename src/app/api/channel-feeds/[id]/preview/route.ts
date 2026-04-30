import { NextResponse } from "next/server";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef } from "@/services/feedValidator";
import { jsonError } from "@/lib/api";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const fields = cf.template.fields as unknown as ChannelFieldDef[];
    const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
    const result = generateFeed(raw, cf.mappings, cf.rules, fields);

    return NextResponse.json({
      fields,
      detectedColumns: cf.sourceFeed.detectedColumns,
      diffs: result.diffs.slice(0, limit),
      rows: result.rows.slice(0, limit),
      sourceSample: raw.slice(0, limit),
      validation: result.validation,
      health: result.health,
      productCount: result.productCount,
      excludedCount: result.excludedCount,
    });
  } catch (e) {
    return jsonError(e);
  }
}
