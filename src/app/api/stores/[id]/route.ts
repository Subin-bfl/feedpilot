import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStore, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const StoreUpdateInput = z.object({
  name: z.string().min(1).max(120).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  xmlFeedUrl: z.string().url().optional().or(z.literal("")),
  xmlSyncFrequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const store = await prisma.store.findFirst({
      where: { id: params.id, organizationId: t.organizationId },
      include: {
        sourceFeeds: { orderBy: { uploadedAt: "desc" } },
        channelFeeds: { orderBy: { createdAt: "desc" } },
        _count: { select: { products: true } },
      },
    });
    if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(store);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireStore(params.id, t.organizationId);
    const body = StoreUpdateInput.parse(await req.json());
    const updated = await prisma.store.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.websiteUrl !== undefined ? { websiteUrl: body.websiteUrl || null } : {}),
        ...(body.xmlFeedUrl !== undefined ? { xmlFeedUrl: body.xmlFeedUrl || null } : {}),
        ...(body.xmlSyncFrequency !== undefined ? { xmlSyncFrequency: body.xmlSyncFrequency } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireStore(params.id, t.organizationId);
    await prisma.store.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
