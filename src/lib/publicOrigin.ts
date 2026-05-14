/**
 * Public origin the browser used (https://app.example.com), not the internal bind URL
 * Next may see behind Railway / other reverse proxies (often http://127.0.0.1:PORT).
 *
 * Note: `localhost` is a valid dev hostname and must be trusted. Only numeric loopback /
 * private bind addresses are treated as untrusted for redirects.
 */
function isUntrustedBindHost(hostWithMaybePort: string): boolean {
  const host = hostWithMaybePort.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return true;
  if (host === "localhost") return false;
  if (host === "0.0.0.0" || host === "[::1]") return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(host);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

/** APP_URL / NEXTAUTH_URL as origin (includes http://localhost for local .env). */
function originFromEnv(): string | null {
  const raw = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

export function getPublicOriginFromRequest(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = req.headers.get("host")?.split(",")[0]?.trim();
  const host = xfHost || hostHeader;

  if (host && !isUntrustedBindHost(host)) {
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      xfProto || (host.toLowerCase().startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const fromEnv = originFromEnv();
  if (fromEnv) return fromEnv;

  return new URL(req.url).origin;
}
