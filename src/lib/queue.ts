import { Queue, type JobsOptions } from "bullmq";
import { redis, isRedisAvailable } from "@/lib/redis";

export const FEED_QUEUE = "feed-processing";

let _queue: Queue | null = null;

export function feedQueue(): Queue | null {
  if (!isRedisAvailable()) return null;
  if (_queue) return _queue;
  _queue = new Queue(FEED_QUEUE, { connection: redis });
  return _queue;
}

export async function enqueueGenerate(channelFeedId: string, opts?: JobsOptions) {
  const q = feedQueue();
  if (!q) return null;
  return q.add("generate", { channelFeedId }, { removeOnComplete: 100, ...opts });
}
