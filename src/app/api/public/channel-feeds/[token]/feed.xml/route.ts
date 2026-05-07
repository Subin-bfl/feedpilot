import { prisma } from "@/lib/db";
import { generateFeed } from "@/services/feedPipeline";
import { exportXML } from "@/services/feedExporter";
import type { ChannelFieldDef } from "@/services/feedValidator";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const cf = await prisma.channelFeed.findUnique({
    where: { publicToken: params.token },
    include: {
      store: { include: { sourceFeeds: { orderBy: { uploadedAt: "desc" }, take: 1 } } },
      sourceFeed: true,
      template: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  if (!cf) return new Response("Not found", { status: 404 });

  const fields = cf.template.fields as unknown as ChannelFieldDef[];
  const latestSource = cf.store.sourceFeeds[0] ?? cf.sourceFeed;
  const raw = (latestSource.rawProducts ?? []) as Record<string, unknown>[];
  const result = generateFeed(raw, cf.mappings, cf.rules, fields);
  const body = exportXML(result.rows, fields, {
    title: cf.name,
    link: cf.store.websiteUrl ?? undefined,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

