import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/tenant";

export async function POST() {
  try {
    const t = await requireAdmin();

    // Wipe org-owned operational data, but keep the org + memberships.
    // Cascade rules handle most of this, but we explicitly delete in a safe order.
    const storeIds = (
      await prisma.store.findMany({
        where: { organizationId: t.organizationId },
        select: { id: true },
      })
    ).map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      if (storeIds.length > 0) {
        // Channel feeds are store-scoped; delete first to cascade mappings/rules/exports/validations/jobs.
        await tx.channelFeed.deleteMany({ where: { storeId: { in: storeIds } } });
        await tx.product.deleteMany({ where: { storeId: { in: storeIds } } });
        await tx.sourceFeed.deleteMany({ where: { storeId: { in: storeIds } } });
        await tx.store.deleteMany({ where: { id: { in: storeIds } } });
      }

      // Remove org templates (both system + custom) as requested by “factory reset”.
      await tx.channelTemplate.deleteMany({ where: { organizationId: t.organizationId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

