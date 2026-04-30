import Link from "next/link";
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
  { href: "/mapping", label: "Mapping" },
  { href: "/rules", label: "Rules" },
  { href: "/validation", label: "Validation" },
  { href: "/preview", label: "Preview" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-muted/20 px-4 py-6">
        <div className="mb-8">
          <Link href="/dashboard" className="text-lg font-bold">
            FeedPilot
          </Link>
          <p className="text-xs text-muted-foreground">{session.user?.email}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
