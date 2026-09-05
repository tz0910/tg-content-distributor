import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth
} = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const input = LoginInput.safeParse(credentials);
        if (!input.success) return null;
        const user = await prisma.user.findUnique({ where: { email: input.data.email } });
        if (!user) return null;
        const valid = await bcrypt.compare(input.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      }
    })
  ]
});
