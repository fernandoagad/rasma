import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users, googleTokens, loginAttempts, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days for "remember me"
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
        rememberMe: { type: "text" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const rememberMe = credentials?.rememberMe === "true";

        const rateCheck = checkRateLimit(`login:${email}`);
        if (!rateCheck.allowed) {
          await db.insert(loginAttempts).values({
            email,
            success: false,
          });
          throw new Error("RATE_LIMITED");
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user || !user.active || !user.passwordHash) {
          await db.insert(loginAttempts).values({
            email,
            success: false,
          });
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          await db.insert(loginAttempts).values({
            email,
            success: false,
          });
          return null;
        }

        resetRateLimit(`login:${email}`);
        await db.insert(loginAttempts).values({
          email,
          success: true,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          linkedPatientId: user.linkedPatientId || null,
          rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        // Check if user exists
        let dbUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (dbUser) {
          // Existing user — must be active
          if (!dbUser.active) return false;

          // Store/update Google tokens for Calendar API
          if (account.access_token) {
            const existing = await db.query.googleTokens.findFirst({
              where: eq(googleTokens.userId, dbUser.id),
            });

            if (existing) {
              await db
                .update(googleTokens)
                .set({
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token || existing.refreshToken,
                  expiresAt: account.expires_at
                    ? new Date(account.expires_at * 1000)
                    : null,
                  scope: account.scope || null,
                  tokenType: account.token_type || null,
                  updatedAt: new Date(),
                })
                .where(eq(googleTokens.userId, dbUser.id));
            } else {
              await db.insert(googleTokens).values({
                userId: dbUser.id,
                accessToken: account.access_token,
                refreshToken: account.refresh_token || null,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                scope: account.scope || null,
                tokenType: account.token_type || null,
              });
            }
          }

          // Update provider if first Google login
          if (dbUser.authProvider === "credentials") {
            await db
              .update(users)
              .set({ authProvider: "google", updatedAt: new Date() })
              .where(eq(users.id, dbUser.id));
          }
        } else {
          // New user via Google — auto-create as invitado (admin can upgrade role later)
          // Try to auto-link to an existing patient record by email
          const matchingPatient = await db.query.patients.findFirst({
            where: eq(patients.email, email),
            columns: { id: true },
          });

          const [newUser] = await db
            .insert(users)
            .values({
              name: user.name || email.split("@")[0],
              email,
              image: user.image || null,
              authProvider: "google",
              role: matchingPatient ? "paciente" : "invitado",
              linkedPatientId: matchingPatient?.id || null,
              emailVerifiedAt: new Date(),
            })
            .returning({ id: users.id });

          dbUser = { ...newUser, role: (matchingPatient ? "paciente" : "invitado") as "paciente" | "invitado" } as NonNullable<typeof dbUser>;

          if (account.access_token) {
            await db.insert(googleTokens).values({
              userId: newUser.id,
              accessToken: account.access_token,
              refreshToken: account.refresh_token || null,
              expiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              scope: account.scope || null,
              tokenType: account.token_type || null,
            });
          }
        }

        // Attach role + linkedPatientId to the user object for JWT callback
        user.id = dbUser!.id;
        user.role = dbUser!.role;
        user.linkedPatientId = (dbUser as { linkedPatientId?: string | null }).linkedPatientId || null;

        // Send login security alert (non-blocking, dynamic import to avoid edge runtime issues)
        if (dbUser!.email) {
          import("@/lib/email").then(({ sendLoginAlert }) => {
            sendLoginAlert(dbUser!.email!, dbUser!.name || "Usuario", "google").catch(() => {});
          }).catch(() => {});
        }
      }

      // Send login alert for credentials login
      if (account?.provider === "credentials" && user.email) {
        import("@/lib/email").then(({ sendLoginAlert }) => {
          sendLoginAlert(user.email!, user.name || "Usuario", "credentials").catch(() => {});
        }).catch(() => {});
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.linkedPatientId = user.linkedPatientId;
        token.rememberMe = (user as Record<string, unknown>).rememberMe ?? true;
        token.roleCheckedAt = Date.now();
      }

      // Refresh role from database periodically (every 30 seconds)
      // so admin role changes take effect without requiring logout
      if (token.id) {
        const lastCheck = (token.roleCheckedAt as number) || 0;
        const elapsed = Date.now() - lastCheck;
        if (elapsed > 30_000) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
            columns: { role: true, active: true, linkedPatientId: true },
          });
          if (dbUser) {
            if (!dbUser.active) {
              delete token.id;
              delete token.role;
              return token;
            }
            token.role = dbUser.role;
            token.linkedPatientId = dbUser.linkedPatientId;
          }
          token.roleCheckedAt = Date.now();
        }
      }

      // Soft expiry: non-remember-me sessions expire after 24 hours
      if (!token.rememberMe && token.iat) {
        const ageSeconds = Math.floor(Date.now() / 1000) - (token.iat as number);
        if (ageSeconds > 24 * 60 * 60) {
          delete token.id;
          delete token.role;
        }
      }

      // Google tokens are stored in the database (googleTokens table)
      // and fetched server-side when needed — not stored in JWT
      return token;
    },

    session({ session, token }) {
      // If token.id was cleared (soft expiry), invalidate the session
      if (!token.id) {
        // @ts-expect-error -- force null user so auth checks redirect to login
        session.user = null;
        return session;
      }
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.linkedPatientId = (token.linkedPatientId as string) || null;
      }
      return session;
    },
  },
});
