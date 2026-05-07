import { ChannelType, type PrismaClient } from "@prisma/client";

export type TemplateFieldType = "string" | "url" | "price" | "number";
export type TemplateFieldDef = { key: string; label: string; required?: boolean; type?: TemplateFieldType };

export const DEFAULT_TEMPLATES: Array<{
  name: string;
  channel: ChannelType;
  fields: TemplateFieldDef[];
  isSystem: boolean;
}> = [
  {
    name: "Google Shopping (default)",
    channel: ChannelType.GOOGLE,
    isSystem: true,
    fields: [
      { key: "id", label: "ID", required: true, type: "string" },
      { key: "title", label: "Title", required: true, type: "string" },
      { key: "description", label: "Description", required: true, type: "string" },
      { key: "link", label: "Link", required: true, type: "url" },
      { key: "image_link", label: "Image Link", required: true, type: "url" },
      { key: "price", label: "Price", required: true, type: "price" },
      { key: "availability", label: "Availability", required: true, type: "string" },
      { key: "brand", label: "Brand", required: true, type: "string" },
      { key: "google_product_category", label: "Google Product Category", required: false, type: "string" },
      { key: "custom_label_0", label: "Custom Label 0", required: false, type: "string" },
    ],
  },
  {
    name: "Meta Catalog (default)",
    channel: ChannelType.META,
    isSystem: true,
    fields: [
      { key: "id", label: "ID", required: true, type: "string" },
      { key: "title", label: "Title", required: true, type: "string" },
      { key: "description", label: "Description", required: true, type: "string" },
      { key: "link", label: "Link", required: true, type: "url" },
      { key: "image_link", label: "Image Link", required: true, type: "url" },
      { key: "price", label: "Price", required: true, type: "price" },
      { key: "brand", label: "Brand", required: true, type: "string" },
      { key: "availability", label: "Availability", required: true, type: "string" },
      { key: "condition", label: "Condition", required: true, type: "string" },
    ],
  },
  {
    name: "TikTok Shop (default)",
    channel: ChannelType.TIKTOK,
    isSystem: true,
    fields: [
      { key: "sku_id", label: "SKU ID", required: true, type: "string" },
      { key: "title", label: "Title", required: true, type: "string" },
      { key: "description", label: "Description", required: true, type: "string" },
      { key: "landing_url", label: "Landing URL", required: true, type: "url" },
      { key: "image_url", label: "Image URL", required: true, type: "url" },
      { key: "price", label: "Price", required: true, type: "price" },
      { key: "brand", label: "Brand", required: true, type: "string" },
      { key: "availability", label: "Availability", required: true, type: "string" },
      { key: "category", label: "Category", required: false, type: "string" },
    ],
  },
  {
    name: "Microsoft Merchant (default)",
    channel: ChannelType.MICROSOFT,
    isSystem: true,
    fields: [
      { key: "id", label: "ID", required: true, type: "string" },
      { key: "title", label: "Title", required: true, type: "string" },
      { key: "description", label: "Description", required: true, type: "string" },
      { key: "link", label: "Link", required: true, type: "url" },
      { key: "image_link", label: "Image Link", required: true, type: "url" },
      { key: "price", label: "Price", required: true, type: "price" },
      { key: "availability", label: "Availability", required: true, type: "string" },
      { key: "brand", label: "Brand", required: true, type: "string" },
      { key: "mpn", label: "MPN", required: false, type: "string" },
    ],
  },
  {
    name: "Custom (minimal)",
    channel: ChannelType.CUSTOM,
    isSystem: true,
    fields: [
      { key: "id", label: "ID", required: true, type: "string" },
      { key: "title", label: "Title", required: true, type: "string" },
      { key: "price", label: "Price", required: false, type: "price" },
      { key: "url", label: "URL", required: false, type: "url" },
      { key: "image", label: "Image", required: false, type: "url" },
    ],
  },
];

export async function ensureDefaultTemplates(db: PrismaClient, organizationId: string) {
  const existing = await db.channelTemplate.count({ where: { organizationId } });
  if (existing > 0) return { created: 0 };

  const created = await Promise.all(
    DEFAULT_TEMPLATES.map((tpl) =>
      db.channelTemplate.create({
        data: {
          organizationId,
          name: tpl.name,
          channel: tpl.channel,
          fields: tpl.fields as unknown as object,
          isSystem: tpl.isSystem,
        },
      })
    )
  );
  return { created: created.length };
}

