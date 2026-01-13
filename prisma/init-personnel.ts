import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化部门和人员数据...')

  // 1. 创建部门
  const departments = [
    { name: '试验中心' },
    { name: '业务部' },
    { name: '质量部' },
    { name: '检测部' },
  ]

  console.log('创建部门...')
  for (const dept of departments) {
    await prisma.dept.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    })
  }

  // 获取部门ID
  const depts = await prisma.dept.findMany()
  const deptMap = Object.fromEntries(depts.map(d => [d.name, d.id]))

  // 2. 创建人员（密码与手机号相同）
  const personnel = [
    { name: '秦兴国', phone: '18086538595', dept: '试验中心', role: '检测部主任' },
    { name: '张馨', phone: '15952575002', dept: '业务部', role: '业务经理' },
    { name: '姜艺玺', phone: '15588392383', dept: '业务部', role: '业务经理' },
    { name: '王璐', phone: '17605280797', dept: '业务部', role: '业务经理' },
    { name: '刘丽愉', phone: '13478251400', dept: '检测部', role: '产品检测负责人' },
    { name: '严秋平', phone: '18890041215', dept: '检测部', role: '材料检测负责人' },
    { name: '王学九', phone: '18796613768', dept: '检测部', role: '化学组组长' },
    { name: '欧晴', phone: '18552552535', dept: '检测部', role: '化学测试工程师' },
    { name: '周承强', phone: '13816717872', dept: '检测部', role: '物理性能工程师' },
    { name: '吴凡', phone: '17315367348', dept: '检测部', role: '机械性能工程师' },
    { name: '武基勇', phone: '18652535583', dept: '检测部', role: '测试工程师' },
    { name: '胡长伟', phone: '19975077219', dept: '检测部', role: '腐蚀测试工程师' },
    { name: '刘宇航', phone: '13773369674', dept: '检测部', role: '电池测试工程师' },
    { name: '杨朕', phone: '18932362327', dept: '检测部', role: '电池测试工程师' },
  ]

  console.log('创建人员...')
  for (const person of personnel) {
    const password = person.phone // 密码与手机号相同
    const hashedPassword = await bcrypt.hash(password, 10)

    // 检查用户是否已存在（通过手机号）
    const existingUser = await prisma.user.findUnique({
      where: { phone: person.phone },
    })

    if (existingUser) {
      console.log(`用户 ${person.name} 已存在，跳过`)
      continue
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: person.phone, // 用户名使用手机号
        password: hashedPassword,
        name: person.name,
        phone: person.phone,
        deptId: deptMap[person.dept],
        status: 1, // 启用
      },
    })

    console.log(`创建用户: ${person.name} (${person.phone})`)
  }

  console.log('初始化完成！')
  console.log('\n默认登录方式：手机号')
  console.log('默认密码：手机号\n')
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
