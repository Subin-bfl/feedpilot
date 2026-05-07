import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Mapping = z.object({
  channelField: z.string().min(1),
  mode: z.enum(["FIELD", "STATIC", "COMBINE", "LOOKUP", "EXTRACT", "EMPTY"]),
  sourceField: z.string().optional().nullable(),
  staticValue: z.string().optional().nullable(),
  combineFields: z.array(z.string()).optional().default([]),
  separator: z.string().optional().default(" "),
  lookupTable: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
      })
    )
    .optional()
    .default([]),
  extractPattern: z.string().optional().nullable(),
  extractGroup: z.number().int().optional().nullable(),
  valueEdits: z
    .array(
      z.object({
        type: z.enum([
          "overwrite",
          "replace_single",
          "replace_multiple",
          "remove_single",
          "remove_multiple",
          "remove_duplicates",
          "strip_html",
          "add_prefix",
          "add_suffix",
          "recalculate",
          "recapitalize",
          "round",
        ]),
        value: z.string().optional().nullable(),
        from: z.string().optional().nullable(),
        to: z.string().optional().nullable(),
        mode: z.enum(["upper", "lower", "title"]).optional().nullable(),
        formula: z.string().optional().nullable(),
        decimals: z.number().int().optional().nullable(),
        values: z.array(z.string()).optional().default([]),
        pairs: z
          .array(
            z.object({
              from: z.string(),
              to: z.string(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .optional()
    .default([]),
});

const Body = z.object({ mappings: z.array(Mapping) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
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
          lookupTable: (m.lookupTable ?? []) as unknown as object[],
          extractPattern: m.extractPattern ?? null,
          extractGroup: m.extractGroup ?? null,
          valueEdits: (m.valueEdits ?? []) as unknown as object[],
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
