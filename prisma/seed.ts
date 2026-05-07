import { PrismaClient, ChannelType, StorePlatform } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GOOGLE_FIELDS = [
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
];

const META_FIELDS = [
  { key: "id", label: "ID", required: true, type: "string" },
  { key: "title", label: "Title", required: true, type: "string" },
  { key: "description", label: "Description", required: true, type: "string" },
  { key: "link", label: "Link", required: true, type: "url" },
  { key: "image_link", label: "Image Link", required: true, type: "url" },
  { key: "price", label: "Price", required: true, type: "price" },
  { key: "brand", label: "Brand", required: true, type: "string" },
  { key: "availability", label: "Availability", required: true, type: "string" },
  { key: "condition", label: "Condition", required: true, type: "string" },
];

const TIKTOK_FIELDS = [
  { key: "sku_id", label: "SKU ID", required: true, type: "string" },
  { key: "title", label: "Title", required: true, type: "string" },
  { key: "description", label: "Description", required: true, type: "string" },
  { key: "landing_url", label: "Landing URL", required: true, type: "url" },
  { key: "image_url", label: "Image URL", required: true, type: "url" },
  { key: "price", label: "Price", required: true, type: "price" },
  { key: "brand", label: "Brand", required: true, type: "string" },
  { key: "availability", label: "Availability", required: true, type: "string" },
  { key: "category", label: "Category", required: false, type: "string" },
];

const MICROSOFT_FIELDS = [
  { key: "id", label: "ID", required: true, type: "string" },
  { key: "title", label: "Title", required: true, type: "string" },
  { key: "description", label: "Description", required: true, type: "string" },
  { key: "link", label: "Link", required: true, type: "url" },
  { key: "image_link", label: "Image Link", required: true, type: "url" },
  { key: "price", label: "Price", required: true, type: "price" },
  { key: "availability", label: "Availability", required: true, type: "string" },
  { key: "brand", label: "Brand", required: true, type: "string" },
  { key: "mpn", label: "MPN", required: false, type: "string" },
];

const CUSTOM_FIELDS = [
  { key: "id", label: "ID", required: true, type: "string" },
  { key: "title", label: "Title", required: true, type: "string" },
  { key: "price", label: "Price", required: false, type: "price" },
  { key: "url", label: "URL", required: false, type: "url" },
  { key: "image", label: "Image", required: false, type: "url" },
];

const SAMPLE_BRANDS = ["Acme", "Northwind", "Globex", "Initech", "Umbrella"];
const CATEGORIES = ["Apparel", "Electronics", "Home", "Outdoor", "Beauty"];

function makeProduct(i: number) {
  const brand = SAMPLE_BRANDS[i % SAMPLE_BRANDS.length];
  const category = CATEGORIES[i % CATEGORIES.length];
  const price = Math.round((50 + (i * 37) % 900) * 100) / 100;
  return {
    id: `SKU-${1000 + i}`,
    product_name: `${category} Item ${i + 1}`,
    brand,
    description: `${brand} ${category.toLowerCase()} item, model ${i + 1}.`,
    price: price.toFixed(2),
    currency: "USD",
    availability: i % 7 === 0 ? "out of stock" : "in stock",
    image_url: `https://picsum.photos/seed/feedpilot-${i}/600/600`,
    product_url: `https://example.com/p/sku-${1000 + i}`,
    category,
  };
}

async function main() {
  console.log("Seeding…");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@feedpilot.dev" },
    update: {},
    create: {
      email: "demo@feedpilot.dev",
      name: "Demo User",
      passwordHash,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Org", slug: "demo" },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });

  // Ensure the demo user has an active org selected (multi-org support).
  await prisma.user.update({
    where: { id: user.id },
    data: { activeOrganizationId: org.id },
  });

  // Templates
  const googleTpl = await prisma.channelTemplate.create({
    data: {
      organizationId: org.id,
      name: "Google Shopping (default)",
      channel: ChannelType.GOOGLE,
      fields: GOOGLE_FIELDS,
      isSystem: true,
    },
  });

  await prisma.channelTemplate.create({
    data: {
      organizationId: org.id,
      name: "Meta Catalog (default)",
      channel: ChannelType.META,
      fields: META_FIELDS,
      isSystem: true,
    },
  });

  await prisma.channelTemplate.create({
    data: {
      organizationId: org.id,
      name: "TikTok Shop (default)",
      channel: ChannelType.TIKTOK,
      fields: TIKTOK_FIELDS,
      isSystem: true,
    },
  });

  await prisma.channelTemplate.create({
    data: {
      organizationId: org.id,
      name: "Microsoft Merchant (default)",
      channel: ChannelType.MICROSOFT,
      fields: MICROSOFT_FIELDS,
      isSystem: true,
    },
  });

  await prisma.channelTemplate.create({
    data: {
      organizationId: org.id,
      name: "Custom (minimal)",
      channel: ChannelType.CUSTOM,
      fields: CUSTOM_FIELDS,
      isSystem: true,
    },
  });

  // Store
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Demo Store",
      platform: StorePlatform.SHOPIFY,
      currency: "USD",
      country: "US",
      websiteUrl: "https://example.com",
    },
  });

  // Source feed with 20 products
  const products = Array.from({ length: 20 }, (_, i) => makeProduct(i));
  const detectedColumns = Object.keys(products[0]);

  const sourceFeed = await prisma.sourceFeed.create({
    data: {
      storeId: store.id,
      name: "demo-products.csv",
      rawProducts: products as object[],
      detectedColumns,
      productCount: products.length,
    },
  });

  await prisma.product.createMany({
    data: products.map((p) => ({
      storeId: store.id,
      sourceFeedId: sourceFeed.id,
      externalId: p.id,
      title: p.product_name,
      description: p.description,
      brand: p.brand,
      price: parseFloat(p.price),
      currency: p.currency,
      availability: p.availability,
      imageLink: p.image_url,
      productUrl: p.product_url,
      data: p,
    })),
  });

  // Channel feed mapped to Google
  const channelFeed = await prisma.channelFeed.create({
    data: {
      storeId: store.id,
      sourceFeedId: sourceFeed.id,
      templateId: googleTpl.id,
      name: "Google Shopping — Demo",
      channel: ChannelType.GOOGLE,
      mappings: {
        create: [
          { channelField: "id", mode: "FIELD", sourceField: "id" },
          {
            channelField: "title",
            mode: "COMBINE",
            combineFields: ["brand", "product_name"],
            separator: " ",
          },
          { channelField: "description", mode: "FIELD", sourceField: "description" },
          { channelField: "link", mode: "FIELD", sourceField: "product_url" },
          { channelField: "image_link", mode: "FIELD", sourceField: "image_url" },
          { channelField: "price", mode: "FIELD", sourceField: "price" },
          { channelField: "availability", mode: "FIELD", sourceField: "availability" },
          { channelField: "brand", mode: "FIELD", sourceField: "brand" },
          { channelField: "google_product_category", mode: "FIELD", sourceField: "category" },
        ],
      },
    },
  });

  // Sample rules
  await prisma.feedRule.create({
    data: {
      channelFeedId: channelFeed.id,
      name: "Premium label for high-priced items",
      priority: 10,
      conditions: {
        create: [{ field: "price", operator: "greater_than", value: "500" }],
      },
      actions: {
        create: [
          { type: "assign_custom_label", field: "custom_label_0", value: "premium" },
        ],
      },
    },
  });

  await prisma.feedRule.create({
    data: {
      channelFeedId: channelFeed.id,
      name: "Exclude out-of-stock products",
      priority: 100,
      conditions: {
        create: [{ field: "availability", operator: "equals", value: "out of stock" }],
      },
      actions: {
        create: [{ type: "exclude_product" }],
      },
    },
  });

  await prisma.feedRule.create({
    data: {
      channelFeedId: channelFeed.id,
      name: "Prepend brand to title for Apparel",
      priority: 5,
      conditions: {
        create: [{ field: "category", operator: "equals", value: "Apparel" }],
      },
      actions: {
        create: [{ type: "prepend_text", field: "title", value: "[New] " }],
      },
    },
  });

  console.log("Seed complete.");
  console.log("Login: demo@feedpilot.dev / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
