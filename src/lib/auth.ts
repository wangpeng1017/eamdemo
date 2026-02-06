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

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("🔐 [NextAuth Config] 初始化配置")
console.log("🔍 process.env.AUTH_SECRET:", process.env.AUTH_SECRET ? `${process.env.AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")
console.log("🔍 process.env.NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 20)}...` : "undefined")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

if (process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET
  console.log("✅ [NextAuth Config] 已将 AUTH_SECRET 复制到 NEXTAUTH_SECRET")
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
        console.log("🔑 [Auth] authorize 被调用")
        console.log("📞 [Auth] 手机号:", credentials?.phone)

        if (!credentials?.phone || !credentials?.password) {
          console.log("❌ [Auth] 缺少凭证")
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

          console.log("👤 [Auth] 用户查询结果:", user ? `找到用户 ${user.username}` : "❌ 未找到用户")

          if (!user || user.status !== 1) {
            console.log("❌ [Auth] 用户不存在或未激活")
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          console.log("🔐 [Auth] 密码验证:", isValid ? "✅ 正确" : "❌ 错误")

          if (!isValid) {
            return null
          }

          const roles = user.roles.map((ur: any) => ur.role.code)
          const permissions = user.roles.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) => rp.permission.code)
          )

          console.log("✅ [Auth] 认证成功，返回用户 ID:", user.id)

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
      console.log("🎫 [JWT Callback] 被调用")
      console.log("👤 [JWT] user:", user ? `存在 (id: ${user.id})` : "不存在")
      console.log("🔍 [JWT] AUTH_SECRET:", AUTH_SECRET ? `${AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")

      if (user) {
        token.id = user.id
        token.roles = user.roles || []
        token.permissions = user.permissions || []
        console.log("✅ [JWT] token已更新，添加了 id/roles/permissions")
      }

      console.log("📤 [JWT] 返回 token:", JSON.stringify(token, null, 2))
      return token
    },
    async session({ session, token }) {
      console.log("📋 [Session Callback] 被调用")

      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.roles = (token.roles as string[]) || []
        session.user.permissions = (token.permissions as string[]) || []
        console.log("✅ [Session] session.user 已更新")
      }

      console.log("📤 [Session] 返回 session:", JSON.stringify(session, null, 2))
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt" as const
  },
  debug: true
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Helper function to get session (NextAuth v4 compatible)
export async function auth() {
  const { getServerSession } = await import("next-auth/next")
  return await getServerSession(authOptions)
}
