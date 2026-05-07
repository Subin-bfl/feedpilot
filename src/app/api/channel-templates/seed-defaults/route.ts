import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireWriteAccess } from "@/lib/tenant";
import { ensureDefaultTemplates } from "@/services/defaultTemplates";

export async function POST() {
  try {
    const t = await requireWriteAccess();
    const result = await ensureDefaultTemplates(prisma as any, t.organizationId);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}

