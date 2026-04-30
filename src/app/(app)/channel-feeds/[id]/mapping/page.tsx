import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { FieldMapper, type ChannelField } from "@/components/FieldMapper";

export default async function MappingPage({ params }: { params: { id: string } }) {
  const t = await requireTenant();
  const cf = await prisma.channelFeed.findFirst({
    where: { id: params.id, store: { organizationId: t.organizationId } },
    include: { template: true, sourceFeed: true, mappings: true },
  });
  if (!cf) notFound();

  const fields = cf.template.fields as unknown as ChannelField[];
  return (
    <FieldMapper
      channelFeedId={cf.id}
      fields={fields}
      sourceColumns={cf.sourceFeed.detectedColumns}
      initial={cf.mappings.map((m) => ({
        channelField: m.channelField,
        mode: m.mode,
        sourceField: m.sourceField,
        staticValue: m.staticValue,
        combineFields: m.combineFields,
        separator: m.separator,
      }))}
    />
  );
}
