import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      organizationId: string;
      organizationSlug: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    organizationId: string;
    organizationSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    organizationId: string;
    organizationSlug: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const membership = user.memberships[0];
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: membership.organizationId,
          organizationSlug: membership.organization.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.organizationId = user.organizationId;
        token.organizationSlug = user.organizationSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.uid;
        session.user.organizationId = token.organizationId;
        session.user.organizationSlug = token.organizationSlug;
      }
      return session;
    },
  },
};
