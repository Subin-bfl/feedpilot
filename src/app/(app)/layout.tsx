import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stores", label: "Stores" },
  { href: "/products", label: "Products" },
  { href: "/channel-feeds", label: "Channel Feeds" },
  { href: "/channel-templates", label: "Templates" },
  { href: "/users", label: "Users" },
  { href: "/profile", label: "Profile" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#fffef7_0%,#f7f7f7_100%)]">
      <aside className="w-64 shrink-0 border-r border-[#f4c400]/40 bg-white px-4 py-6 shadow-[0_2px_18px_rgba(0,0,0,0.04)]">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Image
              src="/bfl-logo.png"
              alt="BFL Feed Management Tool"
              width={208}
              height={56}
              priority
            />
          </Link>
          <p className="text-xs text-muted-foreground">{session.user?.email}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm text-[#111111] transition-colors hover:bg-[#fff4b3] hover:text-[#111111]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
