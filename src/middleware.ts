import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stores/:path*",
    "/products/:path*",
    "/channel-feeds/:path*",
    "/channel-templates/:path*",
    "/mapping/:path*",
    "/rules/:path*",
    "/validation/:path*",
    "/preview/:path*",
  ],
};
