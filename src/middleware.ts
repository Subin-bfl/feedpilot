import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/stores",
    "/stores/:path*",
    "/products",
    "/products/:path*",
    "/channel-feeds",
    "/channel-feeds/:path*",
    "/channel-templates",
    "/channel-templates/:path*",
    "/mapping",
    "/mapping/:path*",
    "/rules",
    "/rules/:path*",
    "/validation",
    "/validation/:path*",
    "/preview",
    "/preview/:path*",
  ],
};
