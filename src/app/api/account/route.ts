import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function DELETE() {
  try {
    const t = await requireTenant();

    // Prevent deleting the last admin of the active org.
    const myMembership = await prisma.organizationMember.findFirst({
      where: { userId: t.userId, organizationId: t.organizationId },
    });
    if (myMembership && (myMembership.role === "OWNER" || myMembership.role === "ADMIN")) {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: t.organizationId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Assign another admin before deleting this account" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: t.userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

