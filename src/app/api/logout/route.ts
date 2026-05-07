import { NextResponse } from "next/server";

function expireCookie(res: NextResponse, name: string) {
  res.cookies.set({
    name,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = new URL("/login", url.origin);
  const res = NextResponse.redirect(redirectTo, 302);

  // NextAuth cookie names differ between http/local and https/prod.
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ];

  for (const name of cookieNames) expireCookie(res, name);
  return res;
}

