import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { TemplateCard } from "./TemplateCard";
import { Button } from "@/components/ui/button";

type TemplateFieldType = "string" | "url" | "price" | "number";
type TemplateField = {
  key: string;
  label: string;
  required?: boolean;
  type?: TemplateFieldType;
};

export default async function TemplatesPage() {
  const t = await requireTenant();
  const templates = await prisma.channelTemplate.findMany({
    where: { organizationId: t.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Channel templates</h1>
        <p className="text-sm text-muted-foreground">
          Field schemas used when generating feeds for each channel.
        </p>
      </div>
      {templates.length === 0 && (
        <div className="rounded-md border bg-white p-4">
          <p className="text-sm text-muted-foreground">
            No templates found for this organization.
          </p>
          <form action="/api/channel-templates/seed-defaults" method="post" className="mt-3">
            <Button type="submit">Create default templates</Button>
          </form>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tpl) => {
          const fields =
            (tpl.fields as TemplateField[]) ?? [];
          return (
            <TemplateCard
              key={tpl.id}
              template={{ id: tpl.id, name: tpl.name, channel: tpl.channel, fields }}
            />
          );
        })}
      </div>
    </div>
  );
}
