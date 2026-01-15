const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔄 开始执行角色清理任务...\n');

  // 步骤1: 创建"普通用户"角色
  console.log('步骤 1/4: 创建"普通用户"角色');
  try {
    const userRole = await prisma.role.upsert({
      where: { code: 'user' },
      update: {
        name: '普通用户',
        description: '系统普通用户，具有基本操作权限',
        dataScope: 'self',
      },
      create: {
        name: '普通用户',
        code: 'user',
        description: '系统普通用户，具有基本操作权限',
        dataScope: 'self',
        status: true,
      },
    });
    console.log(`✅ 成功创建/更新角色：${userRole.name} (${userRole.code})`);
    console.log(`   ID: ${userRole.id}\n`);
  } catch (error) {
    console.error('❌ 创建角色失败:', error.message);
    throw error;
  }

  // 步骤2: 查询需要迁移的用户
  console.log('步骤 2/4: 查询业务角色的用户');
  const businessRoleCodes = ['sales_manager', 'sales', 'lab_director', 'tester', 'finance', 'sample_admin'];

  const usersWithBusinessRoles = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            code: {
              in: businessRoleCodes,
            },
          },
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log(`📊 找到 ${usersWithBusinessRoles.length} 个用户需要迁移：`);
  usersWithBusinessRoles.forEach(user => {
    const currentRoles = user.roles.map(r => r.role.name).join(', ');
    console.log(`   - ${user.name} (${user.phone || user.email}) [${currentRoles}]`);
  });
  console.log('');

  if (usersWithBusinessRoles.length === 0) {
    console.log('✅ 没有需要迁移的用户\n');
  } else {
    console.log('⚠️  请手动确认是否继续迁移这些用户？\n');
  }

  // 步骤3: 查询审批流程中的角色引用
  console.log('步骤 3/4: 检查审批流程中的角色引用');
  try {
    const approvalFlows = await prisma.approvalFlow.findMany({
      where: {
        status: true,
      },
    });

    if (approvalFlows.length === 0) {
      console.log('✅ 没有活跃的审批流程\n');
    } else {
      let hasBusinessRoleRefs = false;
      approvalFlows.forEach(flow => {
        const nodes = flow.nodes || [];
        nodes.forEach(node => {
          if (node.type === 'role' && businessRoleCodes.includes(node.targetId)) {
            hasBusinessRoleRefs = true;
            console.log(`   ⚠️  流程"${flow.name}"使用角色: ${node.targetName} (${node.targetId})`);
          }
        });
      });

      if (!hasBusinessRoleRefs) {
        console.log('✅ 审批流程中没有使用业务角色\n');
      } else {
        console.log('⚠️  请先修改审批流程后再删除角色\n');
      }
    }
  } catch (error) {
    console.log('⚠️  无法查询审批流程（表可能不存在）:', error.message, '\n');
  }

  // 步骤4: 显示可删除的角色
  console.log('步骤 4/4: 建议删除的业务角色');
  const businessRoles = await prisma.role.findMany({
    where: {
      code: {
        in: businessRoleCodes,
      },
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    });

  console.log('\n可以安全删除的角色（无用户引用）：');
  businessRoles.forEach(role => {
    const status = role._count.users === 0 ? '✅ 可删除' : '⚠️  有用户';
    console.log(`   ${status} - ${role.name} (${role.code}) [用户数: ${role._count.users}]`);
  });
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
