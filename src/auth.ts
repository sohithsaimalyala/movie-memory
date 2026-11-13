import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
  providers: [Google],
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // With database sessions, `session` and `user` are full DB rows (including
    // sessionToken). Return only the fields the app needs; this object is also
    // served to the browser by /api/auth/session.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
        },
      };
    },
  },
});
