import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { generateFeed } from "@/services/feedPipeline";
import { FEED_QUEUE } from "@/lib/queue";
import type { ChannelFieldDef } from "@/services/feedValidator";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is required to run the worker.");
  process.exit(1);
}

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  FEED_QUEUE,
  async (job) => {
    if (job.name !== "generate") return;
    const { channelFeedId } = job.data as { channelFeedId: string };

    const cf = await prisma.channelFeed.findUnique({
      where: { id: channelFeedId },
      include: {
        sourceFeed: true,
        template: true,
        mappings: true,
        rules: { include: { conditions: true, actions: true } },
      },
    });
    if (!cf) throw new Error("Channel feed not found");

    const fields = cf.template.fields as unknown as ChannelFieldDef[];
    const raw = (cf.sourceFeed.rawProducts ?? []) as Record<string, unknown>[];

    const result = generateFeed(raw, cf.mappings, cf.rules, fields);

    await prisma.feedValidationResult.create({
      data: {
        channelFeedId: cf.id,
        score: result.validation.score,
        errorCount: result.validation.errorCount,
        warningCount: result.validation.warningCount,
        issues: result.validation.issues as object[],
      },
    });

    await prisma.channelFeed.update({
      where: { id: cf.id },
      data: { lastRunAt: new Date(), lastScore: result.health.score },
    });

    return { score: result.health.score };
  },
  { connection }
);

worker.on("completed", (job) => console.log(`✓ job ${job.id} completed`));
worker.on("failed", (job, err) =>
  console.error(`✗ job ${job?.id} failed:`, err.message)
);

console.log(`Worker listening on queue "${FEED_QUEUE}"`);
