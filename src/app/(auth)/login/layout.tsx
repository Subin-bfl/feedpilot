import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Root `/` always sends users here first. If they already have a session, skip the login UI.
 */
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");
  return <>{children}</>;
}
