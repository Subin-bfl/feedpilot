import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { generateFeed } from "@/services/feedPipeline";
import { exportCSV } from "@/services/feedExporter";
import type { ChannelFieldDef } from "@/services/feedValidator";
import { jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);

    const fields = cf.template.fields as unknown as ChannelFieldDef[];
    const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
    const result = generateFeed(raw, cf.mappings, cf.rules, fields);
    const body = exportCSV(result.rows, fields);

    await prisma.feedExport.create({
      data: {
        channelFeedId: cf.id,
        format: "CSV",
        body,
        productCount: result.rows.length,
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${cf.name.replace(/[^a-z0-9._-]+/gi, "_")}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
