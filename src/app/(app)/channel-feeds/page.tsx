import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChannelFeedDeleteButton } from "./ChannelFeedDeleteButton";

export default async function ChannelFeedsPage() {
  const t = await requireTenant();
  const feeds = await prisma.channelFeed.findMany({
    where: { store: { organizationId: t.organizationId } },
    include: {
      store: true,
      template: true,
      _count: { select: { mappings: true, rules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channel feeds</h1>
          <p className="text-sm text-muted-foreground">Outputs to Google, Meta, TikTok, etc.</p>
        </div>
        <Link href="/channel-feeds/new">
          <Button>New channel feed</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {feeds.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No channel feeds yet.
            </CardContent>
          </Card>
        )}
        {feeds.map((cf) => (
          <Card key={cf.id} className="transition hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Link href={`/channel-feeds/${cf.id}`} className="hover:underline">
                  {cf.name}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cf.channel}</Badge>
                  <ChannelFeedDeleteButton id={cf.id} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Mappings</p>
                <p className="text-lg font-semibold">{cf._count.mappings}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rules</p>
                <p className="text-lg font-semibold">{cf._count.rules}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Score</p>
                <p className="text-lg font-semibold">{cf.lastScore ?? "—"}</p>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground">
                Last run {formatDate(cf.lastRunAt)} · {cf.store.name} · {cf.template.name}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
