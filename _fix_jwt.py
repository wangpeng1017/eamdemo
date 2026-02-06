# -*- coding: utf-8 -*-
content = '''import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { encode, decode } from "next-auth/jwt"

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

// 🔍 DEBUG: 启动时检查环境变量
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("🔐 [NextAuth Config] 初始化配置")
console.log("🔍 process.env.AUTH_SECRET:", process.env.AUTH_SECRET ? `${process.env.AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")
console.log("🔍 process.env.NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 20)}...` : "undefined")
console.log("🔍 process.env.NODE_ENV:", process.env.NODE_ENV)
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// 🔧 FIX: 确保 NEXTAUTH_SECRET 也被设置（NextAuth 内部可能需要）
if (process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
 process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET
 console.log("✅ [NextAuth Config] 已将 AUTH_SECRET 复制到 NEXTAUTH_SECRET")
}

// 保存secret到常量
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
console.log("📦 [NextAuth Config] AUTH_SECRET 常量:", AUTH_SECRET ? `${AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")

if (!AUTH_SECRET) {
 throw new Error("❌ AUTH_SECRET 未设置！无法初始化 NextAuth")
}

// NextAuth v5 配置
export const { handlers, signIn, signOut, auth } = NextAuth({
 secret: AUTH_SECRET,
 providers: [
 Credentials({
  credentials: {
 phone: { label: "手机号", type: "text" },
 password: { label: "密码", type: "password" }
 },
 async authorize(credentials) {
 console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
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

  const roles = user.roles.map((ur: { role: { code: string } }) => ur.role.code)
  const permissions = user.roles.flatMap((ur: { role: { permissions: { permission: { code: string } }[] } }) =>
  ur.role.permissions.map((rp: { permission: { code: string } }) => rp.permission.code)
  )

  console.log("✅ [Auth] 认证成功，返回用户 ID:", user.id)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return {
   id: user.id,
  name: user.name,
  email: user.email || undefined,
  image: user.avatar || undefined,
   roles,
   permissions,
  }
  } catch (error) {
  console.error("💥 [Auth] authorize 错误:", error)
  return null
   }
  })
 ],
 callbacks: {
 async jwt({ token, user }) {
 console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🎫 [JWT Callback] 被调用")
   console.log("📦 [JWT] token:", JSON.stringify(token, null, 2))
  console.log("👤 [JWT] user:", user ? `存在 (id: ${user.id})` : "不存在")
  console.log("🔍 [JWT] AUTH_SECRET:", AUTH_SECRET ? `${AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")
  console.log("🔍 [JWT] process.env.AUTH_SECRET:", process.env.AUTH_SECRET ? `${process.env.AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")
  console.log("🔍 [JWT] process.env.NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")

 if (user) {
 token.id = user.id
  token.roles = (user as { roles?: string[] }).roles || []
   token.permissions = (user as { permissions?: string[] }).permissions || []
  console.log("✅ [JWT] token已更新，添加了 id/roles/permissions")
 }

  console.log("📤 [JWT] 返回 token:", JSON.stringify(token, null, 2))
 console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

 return token
 },
  async session({ session, token }) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📋 [Session Callback] 被调用")
   console.log("📦 [Session] token:", JSON.stringify(token, null, 2))

 if (session.user && token.id) {
 session.user.id = token.id as string
    session.user.roles = (token.roles as string[]) || []
 session.user.permissions = (token.permissions as string[]) || []
   console.log("✅ [Session] session.user 已更新")
 }

 console.log("📤 [Session] 返回 session:", JSON.stringify(session, null, 2))
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

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
 debug: true,
 experimental: {
 // 禁用某些功能可能导致问题
 enableDebugging: true
 }
})
'''

with open('/Users/wangpeng/Downloads/limsnext/src/lib/auth.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ 已更新 src/lib/auth.ts')
print('📝 添加：')
print('  - import { encode, decode } from "next-auth/jwt"')
print('  - experimental: { enableDebugging: true }')
