import { NextResponse } from "next/server";
import { getPublicOriginFromRequest } from "@/lib/publicOrigin";

/** NextAuth may set `secure` or not depending on URL; try both so the browser actually drops the cookie. */
function sweepCookie(res: NextResponse, name: string) {
  for (const secure of [true, false]) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure,
      sameSite: "lax",
    });
  }
}

export async function GET(req: Request) {
  const origin = getPublicOriginFromRequest(req);
  const redirectTo = new URL("/login", origin);
  const res = NextResponse.redirect(redirectTo, 302);

  const baseSession = ["next-auth.session-token", "__Secure-next-auth.session-token"];
  for (const name of baseSession) sweepCookie(res, name);

  for (let i = 0; i < 8; i++) {
    sweepCookie(res, `next-auth.session-token.${i}`);
    sweepCookie(res, `__Secure-next-auth.session-token.${i}`);
  }

  for (const name of [
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.pkce.code_verifier",
    "__Secure-next-auth.pkce.code_verifier",
    "next-auth.state",
    "__Secure-next-auth.state",
  ]) {
    sweepCookie(res, name);
  }

  return res;
}
