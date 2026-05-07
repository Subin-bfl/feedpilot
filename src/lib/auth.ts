import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { OrgRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      organizationId: string;
      organizationSlug: string;
      orgRole: OrgRole;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    organizationId: string;
    organizationSlug: string;
    orgRole: OrgRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    organizationId: string;
    organizationSlug: string;
    orgRole: OrgRole;
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
            memberships: { include: { organization: true } },
          },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const memberships = user.memberships ?? [];
        if (memberships.length === 0) return null;

        const activeMembership =
          (user.activeOrganizationId
            ? memberships.find((m) => m.organizationId === user.activeOrganizationId)
            : null) ?? memberships.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        if (!activeMembership) return null;

        // Persist active org on first login / if invalid.
        if (user.activeOrganizationId !== activeMembership.organizationId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { activeOrganizationId: activeMembership.organizationId },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: activeMembership.organizationId,
          organizationSlug: activeMembership.organization.slug,
          orgRole: activeMembership.role,
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
        token.orgRole = user.orgRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.uid;
        session.user.organizationId = token.organizationId;
        session.user.organizationSlug = token.organizationSlug;
        session.user.orgRole = token.orgRole;
      }
      return session;
    },
  },
};
