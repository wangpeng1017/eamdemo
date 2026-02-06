import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// 扩展 Session 类型
declare module "next-auth" {
 interface Session {
 user: {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  roles?: string[]
  permissions?: string[]
  }
 }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
 Credentials({
  credentials: {
   phone: { label: "手机号", type: "text" },
  password: { label: "密码", type: "password" }
  },
   async authorize(credentials) {
  if (!credentials?.phone || !credentials?.password) {
  return null
   }

  // 使用手机号作为登录账号
 const user = await prisma.user.findUnique({
  where: { username: credentials.phone as string },
  include: {
  roles: {
   include: {
    role: {
   include: {
    permissions: {
     include: { permission: true }
    }
   }
  }
  }
  }
  }
  })

  if (!user || user.status !== 1) {
  return null
  }

  const isValid = await bcrypt.compare(
   credentials.password as string,
  user.password
 )

  if (!isValid) {
 return null
 }

  const roles = user.roles.map((ur: { role: { code: string } }) => ur.role.code)
  const permissions = user.roles.flatMap((ur: { role: { permissions: { permission: { code: string } }[] } }) =>
   ur.role.permissions.map((rp: { permission: { code: string } }) => rp.permission.code)
   )

  return {
  id: user.id,
  name: user.name,
   email: user.email || undefined,
  image: user.avatar || undefined,
  roles,
  permissions,
  }
  }
 })
 ],
 callbacks: {
  async jwt({ token, user }) {
  if (user) {
 token.id = user.id
  token.roles = (user as { roles?: string[] }).roles || []
  token.permissions = (user as { permissions?: string[] }).permissions || []
  }
  return token
  },
 async session({ session, token }) {
 if (session.user && token.id) {
    session.user.id = token.id as string
  session.user.roles = (token.roles as string[]) || []
  session.user.permissions = (token.permissions as string[]) || []
   }
 return session
  }
 },
 pages: {
  signIn: "/login"
 },
  session: {
 strategy: "jwt"
 },
  trustHost: true,
 cookies: {
 sessionToken: {
  name: `next-auth.session-token`,
  options: {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: false // HTTP环境必须设为false
 }
  },
 callbackUrl: {
 name: `next-auth.callback-url`,
  options: {
   sameSite: 'lax',
 path: '/',
  secure: false
  }
  },
 csrfToken: {
  name: `next-auth.csrf-token`,
  options: {
  httpOnly: true,
  sameSite: 'lax',
   path: '/',
  secure: false
 }
 }
 }
})
