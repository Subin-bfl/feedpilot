import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewChannelFeedForm } from "./Form";

export default async function NewChannelFeedPage() {
  const t = await requireTenant();
  const [stores, templates] = await Promise.all([
    prisma.store.findMany({
      where: { organizationId: t.organizationId },
      include: {
        sourceFeeds: { orderBy: { uploadedAt: "desc" } },
      },
    }),
    prisma.channelTemplate.findMany({
      where: { organizationId: t.organizationId },
    }),
  ]);

  if (stores.length === 0) redirect("/stores/new");

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New channel feed</CardTitle>
        </CardHeader>
        <CardContent>
          <NewChannelFeedForm
            stores={stores.map((s) => ({
              id: s.id,
              name: s.name,
              sourceFeeds: s.sourceFeeds.map((sf) => ({
                id: sf.id,
                name: sf.name,
                productCount: sf.productCount,
              })),
            }))}
            templates={templates.map((tpl) => ({
              id: tpl.id,
              name: tpl.name,
              channel: tpl.channel,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
