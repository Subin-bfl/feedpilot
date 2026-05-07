import { NextResponse } from "next/server";
import { requireChannelFeed, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";
import { runChannelFeedGeneration } from "@/services/channelFeedRun";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireChannelFeed(params.id, t.organizationId);
    const run = await runChannelFeedGeneration(params.id);
    return NextResponse.json(run);
  } catch (e) {
    return jsonError(e);
  }
}
