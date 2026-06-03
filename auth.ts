import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // TODO: Replace with real user validation from database
        // For now, hardcoded admin user
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (email === "admin@ruteador.com" && password === "admin123") {
          return {
            id: "1",
            email: "admin@ruteador.com",
            name: "Admin",
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: "jwt", // JWT-based sessions (no database)
  },
  pages: {
    signIn: "/login",
  },
})
