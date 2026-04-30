import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStore, requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    await requireStore(params.id, t.organizationId);
    await prisma.store.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
