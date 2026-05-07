import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStore, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Input = z.object({
  storeId: z.string().min(1),
  sourceFeedId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().min(1).max(160),
  channel: z.enum(["GOOGLE", "META", "TIKTOK", "MICROSOFT", "CUSTOM"]),
  schedule: z.string().optional(),
});

export async function GET() {
  try {
    const t = await requireTenant();
    const feeds = await prisma.channelFeed.findMany({
      where: { store: { organizationId: t.organizationId } },
      include: {
        store: true,
        template: true,
        _count: { select: { mappings: true, rules: true, exports: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(feeds);
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const t = await requireWriteAccess();
    const body = Input.parse(await req.json());
    await requireStore(body.storeId, t.organizationId);

    // Verify the source feed and template belong to this org.
    const [source, template] = await Promise.all([
      prisma.sourceFeed.findFirst({
        where: { id: body.sourceFeedId, store: { organizationId: t.organizationId } },
      }),
      prisma.channelTemplate.findFirst({
        where: { id: body.templateId, organizationId: t.organizationId },
      }),
    ]);
    if (!source) return NextResponse.json({ error: "Source feed not found" }, { status: 404 });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const feed = await prisma.channelFeed.create({
      data: {
        storeId: body.storeId,
        sourceFeedId: body.sourceFeedId,
        templateId: body.templateId,
        name: body.name,
        channel: body.channel,
        schedule: body.schedule,
      },
    });
    return NextResponse.json(feed, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
