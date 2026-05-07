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
        lookupTable: (m.lookupTable as { from: string; to: string }[] | null) ?? [],
        extractPattern: m.extractPattern,
        extractGroup: m.extractGroup,
        valueEdits:
          (m.valueEdits as
            | Array<{
                type: "add_prefix" | "add_suffix" | "replace_single" | "replace_multiple";
                value?: string | null;
                from?: string | null;
                to?: string | null;
                pairs?: Array<{ from: string; to: string }>;
              }>
            | null) ?? [],
      }))}
    />
  );
}
