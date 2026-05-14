import { redirect } from "next/navigation";

/** Public entry: always show login first; `/login` layout sends signed-in users to `/dashboard`. */
export default function Home() {
  redirect("/login");
}
