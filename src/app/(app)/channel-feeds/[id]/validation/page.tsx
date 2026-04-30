import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef, ValidationIssue } from "@/services/feedValidator";
import { ValidationPanel } from "@/components/ValidationPanel";

export default async function ValidationPage({ params }: { params: { id: string } }) {
  const t = await requireTenant();
  const cf = await prisma.channelFeed.findFirst({
    where: { id: params.id, store: { organizationId: t.organizationId } },
    include: {
      template: true,
      sourceFeed: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  if (!cf) notFound();

  const fields = cf.template.fields as unknown as ChannelFieldDef[];
  const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
  const result = generateFeed(raw, cf.mappings, cf.rules, fields);

  return (
    <ValidationPanel
      score={result.validation.score}
      errorCount={result.validation.errorCount}
      warningCount={result.validation.warningCount}
      issues={result.validation.issues as ValidationIssue[]}
    />
  );
}
