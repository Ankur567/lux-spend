import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/lib/auth/auth.config";
import { connectDB } from "@/lib/db/connect";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimiter, RATE_LIMITS } from "@/lib/rate-limit";
import { User } from "@/models/User";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

let dummyHashPromise: Promise<string> | null = null;
const dummyHash = () => (dummyHashPromise ??= hashPassword("timing-equaliser"));

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const { limit, windowMs } = RATE_LIMITS.login;
        const limited = await rateLimiter.hit(`login:${ip}:${email}`, limit, windowMs);
        if (!limited.allowed) throw new RateLimitedSignin();

        await connectDB();
        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user) {
          // Equalise timing so attackers can't enumerate emails.
          await verifyPassword(password, await dummyHash());
          return null;
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
