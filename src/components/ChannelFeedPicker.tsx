import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Server component that lists the org's channel feeds and links each to a
 * specific sub-page (mapping, rules, validation, preview). Used to back the
 * top-level routes from the spec while keeping the actual editor under
 * /channel-feeds/[id]/<section>.
 */
export async function ChannelFeedPicker({
  title,
  description,
  subPath,
}: {
  title: string;
  description: string;
  subPath: "mapping" | "rules" | "validation" | "preview";
}) {
  const t = await requireTenant();
  const feeds = await prisma.channelFeed.findMany({
    where: { store: { organizationId: t.organizationId } },
    include: { store: true, template: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href="/channel-feeds/new">
          <Button>New channel feed</Button>
        </Link>
      </div>

      {feeds.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You don't have any channel feeds yet. Create one to start{" "}
            {subPath === "mapping"
              ? "mapping fields"
              : subPath === "rules"
              ? "writing rules"
              : subPath === "validation"
              ? "validating"
              : "previewing"}
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {feeds.map((cf) => (
            <Link key={cf.id} href={`/channel-feeds/${cf.id}/${subPath}`}>
              <Card className="transition hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{cf.name}</span>
                    <Badge variant="secondary">{cf.channel}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {cf.store.name} · {cf.template.name}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
