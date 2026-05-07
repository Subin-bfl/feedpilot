import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const Body = z.object({
  organizationId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const t = await requireTenant();
    const body = Body.parse(await req.json());

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: t.userId, organizationId: body.organizationId },
    });
    if (!membership) return NextResponse.json({ error: "Not a member of that organization" }, { status: 403 });

    await prisma.user.update({
      where: { id: t.userId },
      data: { activeOrganizationId: body.organizationId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

