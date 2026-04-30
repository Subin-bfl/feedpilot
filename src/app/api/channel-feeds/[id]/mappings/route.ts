import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Mapping = z.object({
  channelField: z.string().min(1),
  mode: z.enum(["FIELD", "STATIC", "COMBINE"]),
  sourceField: z.string().optional().nullable(),
  staticValue: z.string().optional().nullable(),
  combineFields: z.array(z.string()).optional().default([]),
  separator: z.string().optional().default(" "),
});

const Body = z.object({ mappings: z.array(Mapping) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    await requireChannelFeed(params.id, t.organizationId);
    const body = Body.parse(await req.json());

    await prisma.$transaction([
      prisma.fieldMapping.deleteMany({ where: { channelFeedId: params.id } }),
      prisma.fieldMapping.createMany({
        data: body.mappings.map((m) => ({
          channelFeedId: params.id,
          channelField: m.channelField,
          mode: m.mode,
          sourceField: m.sourceField ?? null,
          staticValue: m.staticValue ?? null,
          combineFields: m.combineFields ?? [],
          separator: m.separator ?? " ",
        })),
      }),
    ]);

    const mappings = await prisma.fieldMapping.findMany({
      where: { channelFeedId: params.id },
    });
    return NextResponse.json({ mappings });
  } catch (e) {
    return jsonError(e);
  }
}
