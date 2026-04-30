import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeHealth } from "@/services/feedHealthScore";
import { generateFeed } from "@/services/feedPipeline";
import type { ChannelFieldDef } from "@/services/feedValidator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

export default async function ChannelFeedOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const t = await requireTenant();
  const cf = await prisma.channelFeed.findFirst({
    where: { id: params.id, store: { organizationId: t.organizationId } },
    include: {
      store: true,
      sourceFeed: true,
      template: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  if (!cf) notFound();

  const fields = cf.template.fields as unknown as ChannelFieldDef[];
  const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];
  const result = generateFeed(raw, cf.mappings, cf.rules, fields);
  const health = computeHealth({
    validation: result.validation,
    productCount: result.productCount,
    excludedCount: result.excludedCount,
    lastRunAt: cf.lastRunAt,
  });

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="text-4xl font-bold">{health.score}</div>
            <Badge
              variant={
                health.grade === "A"
                  ? "success"
                  : health.grade === "F"
                  ? "destructive"
                  : "warning"
              }
            >
              {health.grade}
            </Badge>
          </div>
          <ul className="space-y-2 text-sm">
            {health.signals.map((s) => (
              <li key={s.label} className="flex items-center justify-between">
                <span>{s.label}</span>
                <Badge
                  variant={
                    s.status === "ok" ? "success" : s.status === "warn" ? "warning" : "destructive"
                  }
                >
                  {s.detail}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Counts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Source products" value={result.productCount} />
          <Row label="Excluded" value={result.excludedCount} />
          <Row label="Included" value={result.productCount - result.excludedCount} />
          <Row label="Mappings" value={cf.mappings.length} />
          <Row label="Rules" value={cf.rules.length} />
          <Row label="Last run" value={formatDate(cf.lastRunAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule (UI only)</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Cron expression</Label>
          <Input
            defaultValue={cf.schedule ?? ""}
            placeholder="0 */6 * * *"
            disabled
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Scheduling UI is included for parity; actual cron execution is out of MVP scope.
            Click "Generate now" on the header to trigger a run.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
