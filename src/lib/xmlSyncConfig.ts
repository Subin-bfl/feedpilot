function parsePositiveMs(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Max time to download the store XML URL (default 3 minutes). */
export function xmlFetchTimeoutMs(): number {
  return parsePositiveMs(process.env.XML_FETCH_TIMEOUT_MS, 180_000);
}

/** Prisma interactive transaction budget for import (default 5 minutes). */
export function xmlSyncTransactionTimeoutMs(): number {
  return parsePositiveMs(process.env.XML_SYNC_TRANSACTION_TIMEOUT_MS, 300_000);
}
