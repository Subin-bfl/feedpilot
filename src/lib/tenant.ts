import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class TenantError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolve the current authenticated user + organization, or throw.
 * Use in API routes and server components/actions to enforce tenancy.
 */
export async function requireTenant() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    throw new TenantError("Unauthorized", 401);
  }
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    organizationSlug: session.user.organizationSlug,
    email: session.user.email,
  };
}

/** Verify a store belongs to the caller's organization. */
export async function requireStore(storeId: string, organizationId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, organizationId },
  });
  if (!store) throw new TenantError("Store not found", 404);
  return store;
}

/** Verify a channel feed belongs to the caller's org (via its store). */
export async function requireChannelFeed(
  channelFeedId: string,
  organizationId: string
) {
  const cf = await prisma.channelFeed.findFirst({
    where: { id: channelFeedId, store: { organizationId } },
    include: {
      store: true,
      sourceFeed: true,
      template: true,
      mappings: true,
      rules: { include: { conditions: true, actions: true } },
    },
  });
  if (!cf) throw new TenantError("Channel feed not found", 404);
  return cf;
}
