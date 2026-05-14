/**
 * Public origin the browser used (https://app.example.com), not the internal bind URL
 * Next may see behind Railway / other reverse proxies (often http://127.0.0.1:PORT).
 */
export function getPublicOriginFromRequest(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = req.headers.get("host")?.split(",")[0]?.trim();
  const host = xfHost || hostHeader;

  if (host) {
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      xfProto || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const fromEnv = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore */
    }
  }

  return new URL(req.url).origin;
}
