// Auth.js v5 (next-auth 5.0.0-beta.31) — credenciales + argon2 (T4).
// Con provider de credenciales Auth.js solo soporta sesión por JWT en cookie.
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verificarCredenciales } from "@/modules/cuenta/credenciales";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: "clienta" | "admin";
    } & DefaultSession["user"];
  }
  interface User {
    rol?: "clienta" | "admin";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Piloto: una sola instancia detrás del HTTPS de la plataforma.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: (credentials) => verificarCredenciales(credentials),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rol = token.rol as "clienta" | "admin";
      return session;
    },
  },
});
