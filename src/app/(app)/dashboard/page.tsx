import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const t = await requireTenant();
  const orgId = t.organizationId;

  const [storeCount, sourceFeedCount, channelFeeds, latestValidation] = await Promise.all([
    prisma.store.count({ where: { organizationId: orgId } }),
    prisma.sourceFeed.count({ where: { store: { organizationId: orgId } } }),
    prisma.channelFeed.findMany({
      where: { store: { organizationId: orgId } },
      include: { store: true, template: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.feedValidationResult.findFirst({
      where: { channelFeed: { store: { organizationId: orgId } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your stores, feeds, and health.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Stores" value={storeCount} href="/stores" />
        <Stat label="Source feeds" value={sourceFeedCount} href="/stores" />
        <Stat label="Channel feeds" value={channelFeeds.length} href="/channel-feeds" />
        <Stat
          label="Latest validation score"
          value={latestValidation ? `${latestValidation.score}/100` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent channel feeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {channelFeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No channel feeds yet.{" "}
              <Link href="/channel-feeds" className="underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            channelFeeds.map((cf) => (
              <Link
                key={cf.id}
                href={`/channel-feeds/${cf.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{cf.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cf.store.name} · {cf.template.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cf.channel}</Badge>
                  {cf.lastScore != null && (
                    <Badge variant={cf.lastScore >= 80 ? "success" : "warning"}>
                      {cf.lastScore}/100
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDate(cf.lastRunAt)}</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {latestValidation && (
        <Card>
          <CardHeader>
            <CardTitle>Latest issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="destructive">{latestValidation.errorCount} errors</Badge>
              <Badge variant="warning">{latestValidation.warningCount} warnings</Badge>
              <span className="text-muted-foreground">
                generated {formatDate(latestValidation.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}
