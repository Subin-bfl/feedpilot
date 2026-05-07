import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireChannelFeed, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Condition = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "contains", "greater_than", "less_than", "is_empty", "regex"]),
  value: z.string().optional().nullable(),
});

const Action = z.object({
  type: z.enum([
    "set_value",
    "append_text",
    "prepend_text",
    "replace",
    "include_product",
    "exclude_product",
    "assign_custom_label",
  ]),
  field: z.string().optional().nullable(),
  value: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
});

const Rule = z.object({
  name: z.string().min(1).max(160),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  conditions: z.array(Condition).default([]),
  actions: z.array(Action).min(1),
});

const Body = z.object({ rules: z.array(Rule) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireChannelFeed(params.id, t.organizationId);
    const body = Body.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.feedRule.deleteMany({ where: { channelFeedId: params.id } });
      for (const rule of body.rules) {
        await tx.feedRule.create({
          data: {
            channelFeedId: params.id,
            name: rule.name,
            enabled: rule.enabled,
            priority: rule.priority,
            conditions: { create: rule.conditions },
            actions: { create: rule.actions },
          },
        });
      }
    });

    const rules = await prisma.feedRule.findMany({
      where: { channelFeedId: params.id },
      include: { conditions: true, actions: true },
      orderBy: { priority: "asc" },
    });
    return NextResponse.json({ rules });
  } catch (e) {
    return jsonError(e);
  }
}
