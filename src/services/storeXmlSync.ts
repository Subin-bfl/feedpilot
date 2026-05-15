import { prisma } from "@/lib/db";
import { enqueueGenerate } from "@/lib/queue";
import { isRedisAvailable } from "@/lib/redis";
import { xmlFetchTimeoutMs, xmlSyncTransactionTimeoutMs } from "@/lib/xmlSyncConfig";
import { extractProductFields, parseXML } from "@/services/feedParser";
import type { SyncFrequency } from "@prisma/client";
import { runChannelFeedGeneration } from "@/services/channelFeedRun";

const AUTO_XML_FEED_NAME_PREFIX = "[auto-xml]";

function frequencyMs(frequency: SyncFrequency): number {
  if (frequency === "HOURLY") return 60 * 60 * 1000;
  if (frequency === "WEEKLY") return 7 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function isSyncDue(opts: { frequency: SyncFrequency; lastSyncAt: Date | null; now: Date }): boolean {
  if (!opts.lastSyncAt) return true;
  return opts.lastSyncAt.getTime() + frequencyMs(opts.frequency) <= opts.now.getTime();
}

async function fetchXml(xmlFeedUrl: string): Promise<string> {
  const timeoutMs = xmlFetchTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(xmlFeedUrl, {
      method: "GET",
      headers: { Accept: "application/xml, text/xml, */*" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`XML fetch failed (${res.status})`);
    return await res.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const seconds = Math.round(timeoutMs / 1000);
      throw new Error(
        `Downloading XML feed timed out after ${seconds}s. For large feeds, set XML_FETCH_TIMEOUT_MS in .env (e.g. 300000 for 5 minutes).`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type XmlSyncResult = { channelFeedsQueued: boolean };

export async function syncStoreFromXmlUrl(storeId: string): Promise<XmlSyncResult> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      xmlFeedUrl: true,
      currency: true,
    },
  });
  if (!store?.xmlFeedUrl) {
    throw new Error("Store does not have an XML feed URL configured.");
  }

  const xml = await fetchXml(store.xmlFeedUrl);
  const parsed = await parseXML(xml);
  if (parsed.rows.length === 0) throw new Error("XML contained no products.");

  const now = new Date();

  const channelFeedIds = await prisma.channelFeed.findMany({
    where: { storeId: store.id },
    select: { id: true },
  });

  const txTimeout = xmlSyncTransactionTimeoutMs();
  await prisma.$transaction(async (tx) => {
    const previousAutoFeeds = await tx.sourceFeed.findMany({
      where: {
        storeId: store.id,
        name: { startsWith: AUTO_XML_FEED_NAME_PREFIX },
      },
      select: { id: true },
    });

    const sourceFeed = await tx.sourceFeed.create({
      data: {
        storeId: store.id,
        name: `${AUTO_XML_FEED_NAME_PREFIX} ${store.xmlFeedUrl}`,
        rawProducts: parsed.rows as object[],
        detectedColumns: parsed.columns,
        productCount: parsed.rows.length,
      },
    });

    const oldSourceFeedIds = previousAutoFeeds.map((x) => x.id);
    if (oldSourceFeedIds.length > 0) {
      await tx.product.deleteMany({
        where: {
          storeId: store.id,
          sourceFeedId: { in: oldSourceFeedIds },
        },
      });
    }

    const productData = parsed.rows.map((row) => {
      const f = extractProductFields(row);
      return {
        storeId: store.id,
        sourceFeedId: sourceFeed.id,
        externalId: f.externalId ?? null,
        title: f.title ?? "(untitled)",
        description: f.description ?? null,
        brand: f.brand ?? null,
        price: f.price ?? null,
        currency: f.currency ?? store.currency ?? null,
        availability: f.availability ?? null,
        imageLink: f.imageLink ?? null,
        productUrl: f.productUrl ?? null,
        data: row as object,
      };
    });

    const CHUNK = 500;
    for (let i = 0; i < productData.length; i += CHUNK) {
      await tx.product.createMany({
        data: productData.slice(i, i + CHUNK),
      });
    }

    await tx.store.update({
      where: { id: store.id },
      data: {
        xmlLastSyncAt: now,
        xmlLastSyncError: null,
      },
    });

    await tx.channelFeed.updateMany({
      where: { storeId: store.id },
      data: { sourceFeedId: sourceFeed.id },
    });
  }, {
    maxWait: Math.min(txTimeout, 60_000),
    timeout: txTimeout,
  });

  if (isRedisAvailable()) {
    for (const cf of channelFeedIds) {
      await enqueueGenerate(cf.id);
    }
    return { channelFeedsQueued: true };
  }

  for (const cf of channelFeedIds) {
    await runChannelFeedGeneration(cf.id);
  }
  return { channelFeedsQueued: false };
}

export async function syncDueStoresFromXmlUrl() {
  const now = new Date();
  const stores = await prisma.store.findMany({
    where: { xmlFeedUrl: { not: null } },
    select: {
      id: true,
      xmlFeedUrl: true,
      xmlSyncFrequency: true,
      xmlLastSyncAt: true,
    },
  });

  for (const store of stores) {
    if (!store.xmlFeedUrl) continue;
    if (!isSyncDue({ frequency: store.xmlSyncFrequency, lastSyncAt: store.xmlLastSyncAt, now })) {
      continue;
    }

    try {
      await syncStoreFromXmlUrl(store.id);
      console.log(`XML sync complete for store ${store.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown XML sync error";
      console.error(`XML sync failed for store ${store.id}: ${message}`);
      await prisma.store.update({
        where: { id: store.id },
        data: { xmlLastSyncError: message },
      });
    }
  }
}

