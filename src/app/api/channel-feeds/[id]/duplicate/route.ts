import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Body = z.object({
  name: z.string().min(1).max(160).optional(),
  templateId: z.string().optional(),
  channel: z.enum(["GOOGLE", "META", "TIKTOK", "MICROSOFT", "CUSTOM"]).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireTenant();
    const cf = await requireChannelFeed(params.id, t.organizationId);
    const body = Body.parse(await req.json().catch(() => ({})));

    const targetTemplateId = body.templateId ?? cf.templateId;
    if (body.templateId) {
      const tpl = await prisma.channelTemplate.findFirst({
        where: { id: body.templateId, organizationId: t.organizationId },
      });
      if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const dup = await prisma.channelFeed.create({
      data: {
        storeId: cf.storeId,
        sourceFeedId: cf.sourceFeedId,
        templateId: targetTemplateId,
        channel: body.channel ?? cf.channel,
        name: body.name ?? `${cf.name} (copy)`,
        mappings: {
          create: cf.mappings.map((m) => ({
            channelField: m.channelField,
            mode: m.mode,
            sourceField: m.sourceField,
            staticValue: m.staticValue,
            combineFields: m.combineFields,
            separator: m.separator,
          })),
        },
        rules: {
          create: cf.rules.map((r) => ({
            name: r.name,
            enabled: r.enabled,
            priority: r.priority,
            conditions: {
              create: r.conditions.map((c) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
              })),
            },
            actions: {
              create: r.actions.map((a) => ({
                type: a.type,
                field: a.field,
                value: a.value,
                search: a.search,
              })),
            },
          })),
        },
      },
    });
    return NextResponse.json(dup, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
