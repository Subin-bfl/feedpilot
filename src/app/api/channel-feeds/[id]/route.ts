import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);
    return NextResponse.json(cf);
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireChannelFeed(params.id, t.organizationId);
    await prisma.channelFeed.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
