import { NextResponse } from "next/server";
import { requireStore, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";
import { syncStoreFromXmlUrl } from "@/services/storeXmlSync";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireStore(params.id, t.organizationId);
    await syncStoreFromXmlUrl(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

