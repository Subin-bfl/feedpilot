import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { RuleBuilder } from "@/components/RuleBuilder";

export default async function RulesPage({ params }: { params: { id: string } }) {
  const t = await requireTenant();
  const cf = await prisma.channelFeed.findFirst({
    where: { id: params.id, store: { organizationId: t.organizationId } },
    include: {
      template: true,
      sourceFeed: true,
      rules: { include: { conditions: true, actions: true }, orderBy: { priority: "asc" } },
    },
  });
  if (!cf) notFound();

  const fields = (cf.template.fields as unknown as { key: string }[]).map((f) => f.key);

  return (
    <RuleBuilder
      channelFeedId={cf.id}
      channelFields={fields}
      sourceColumns={cf.sourceFeed.detectedColumns}
      initial={cf.rules.map((r) => ({
        name: r.name,
        enabled: r.enabled,
        priority: r.priority,
        conditions: r.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        actions: r.actions.map((a) => ({
          type: a.type,
          field: a.field,
          value: a.value,
          search: a.search,
        })),
      }))}
    />
  );
}
