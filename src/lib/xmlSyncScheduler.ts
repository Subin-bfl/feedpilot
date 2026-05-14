const g = globalThis as typeof globalThis & { __feedpilotXmlSyncScheduler?: true };

const TICK_MS = 60_000;

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

async function tick() {
  const { syncDueStoresFromXmlUrl } = await import("@/services/storeXmlSync");
  try {
    await syncDueStoresFromXmlUrl();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown XML sync scheduler error";
    console.error(`XML sync scheduler failed: ${message}`);
  }
}

/**
 * Polls for stores whose XML URL sync interval has elapsed (hourly / daily / weekly).
 * Runs in the Next.js Node server — no separate worker or Redis required.
 */
export function startXmlSyncScheduler(): void {
  if (g.__feedpilotXmlSyncScheduler) return;
  if (isBuildPhase()) return;

  g.__feedpilotXmlSyncScheduler = true;

  void tick();
  setInterval(() => {
    void tick();
  }, TICK_MS);
}
