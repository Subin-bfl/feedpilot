"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * useSearchParams() must live inside a Suspense boundary to allow Next.js to
 * statically prerender the surrounding shell. We split the form into an inner
 * client component and Suspend it from the page.
 */
export default function LoginPage() {
  return (
    <Card className="border-[#f4c400]/40 bg-white shadow-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold text-[#111111]">
          Login to your account
        </CardTitle>
        <CardDescription>
          Welcome to <span className="font-medium text-[#111111]">BFL Feed Management Tool</span>.{" "}
          <Link href="/register" className="underline">
            Create an account
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(sp.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="bg-[#f4c400] font-semibold text-[#111111] hover:bg-[#e5b900]"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted/70" />
    </div>
  );
}
