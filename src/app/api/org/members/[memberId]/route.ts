import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/tenant";

const PatchBody = z.object({
  role: z.enum(["ADMIN", "STANDARD", "READONLY"]),
});

export async function PATCH(req: Request, { params }: { params: { memberId: string } }) {
  try {
    const t = await requireAdmin();
    const body = PatchBody.parse(await req.json());

    const member = await prisma.organizationMember.findFirst({
      where: { id: params.memberId, organizationId: t.organizationId },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Avoid leaving the org without any admin.
    if ((member.role === "OWNER" || member.role === "ADMIN") && body.role !== member.role) {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: t.organizationId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Organization must have at least one admin" }, { status: 400 });
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: params.memberId },
      data: { role: body.role },
    });
    return NextResponse.json({ member: updated });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { memberId: string } }) {
  try {
    const t = await requireAdmin();
    const member = await prisma.organizationMember.findFirst({
      where: { id: params.memberId, organizationId: t.organizationId },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Prevent removing the last admin.
    if (member.role === "OWNER" || member.role === "ADMIN") {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: t.organizationId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Organization must have at least one admin" }, { status: 400 });
      }
    }

    await prisma.organizationMember.delete({ where: { id: member.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

