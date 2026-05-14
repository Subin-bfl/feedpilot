/**
 * Public origin the browser used (https://app.example.com), not the internal bind URL
 * Next may see behind Railway / other reverse proxies (often http://127.0.0.1:PORT).
 */
function isLikelyPublicHost(hostWithMaybePort: string): boolean {
  const host = hostWithMaybePort.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return false;
  if (host === "localhost" || host === "0.0.0.0" || host === "[::1]") return false;
  if (host === "127.0.0.1" || host.startsWith("127.")) return false;
  if (host.startsWith("10.")) return false;
  if (host.startsWith("192.168.")) return false;
  const m = /^172\.(\d+)\./.exec(host);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return false;
  }
  return true;
}

function originFromConfiguredPublicUrl(): string | null {
  const raw = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (!isLikelyPublicHost(u.host)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getPublicOriginFromRequest(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = req.headers.get("host")?.split(",")[0]?.trim();
  const host = xfHost || hostHeader;

  if (host && isLikelyPublicHost(host)) {
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      xfProto || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const fromEnv = originFromConfiguredPublicUrl();
  if (fromEnv) return fromEnv;

  return new URL(req.url).origin;
}
