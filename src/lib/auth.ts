import NextAuth, { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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

  interface JWT {
    id: string
    roles?: string[]
    permissions?: string[]
  }
}


const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🔐 [NextAuth Config] 初始化配置")
  console.log("🔍 AUTH_SECRET:", process.env.AUTH_SECRET ? '已设置' : '❌ 未设置')
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

if (process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET
}

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

if (!AUTH_SECRET) {
  throw new Error("❌ AUTH_SECRET 未设置！")
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "手机号", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (isDev) console.log("🔑 [Auth] authorize 被调用, 手机号:", credentials?.phone)

        if (!credentials?.phone || !credentials?.password) {
          if (isDev) console.log("❌ [Auth] 缺少凭证")
          return null
        }

        try {
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

          if (isDev) console.log("👤 [Auth] 用户查询结果:", user ? `找到用户 ${user.username}` : "未找到")

          if (!user || user.status !== 1) {
            if (isDev) console.log("❌ [Auth] 用户不存在或未激活")
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (isDev) console.log("🔐 [Auth] 密码验证:", isValid ? "✅ 正确" : "❌ 错误")

          if (!isValid) {
            return null
          }

          const roles = user.roles.map((ur: any) => ur.role.code)
          const permissions = user.roles.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) => rp.permission.code)
          )

          if (isDev) console.log("✅ [Auth] 认证成功, 用户 ID:", user.id)

          return {
            id: user.id,
            name: user.name,
            email: user.email || undefined,
            image: user.avatar || undefined,
            roles,
            permissions
          }
        } catch (error) {
          console.error("💥 [Auth] authorize 错误:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles || []
        token.permissions = user.permissions || []
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
    strategy: "jwt" as const
  },
  debug: isDev
}

// Helper function to get session (NextAuth v4 compatible)
export async function auth() {
  const { getServerSession } = await import("next-auth/next")
  return await getServerSession(authOptions)
}
