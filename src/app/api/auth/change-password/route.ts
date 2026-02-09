import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'
import bcrypt from 'bcryptjs'

// 修改密码 API
export const PUT = withAuth(async (request: NextRequest, user) => {
    const { oldPassword, newPassword } = await request.json()

    if (!oldPassword || !newPassword) {
        return badRequest('请输入原密码和新密码')
    }

    if (newPassword.length < 6) {
        return badRequest('新密码长度不能少于6位')
    }

    // 获取用户当前密码
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true }
    })

    if (!dbUser?.password) {
        return badRequest('用户信息异常')
    }

    // 验证原密码
    const isValid = await bcrypt.compare(oldPassword, dbUser.password)
    if (!isValid) {
        return badRequest('原密码不正确')
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    })

    return success({ message: '密码修改成功' })
})
