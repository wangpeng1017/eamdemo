// 使用 Prisma Client 查询数据库
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:word_mysql_root@8.130.182.148:3307/lims?connect_timeout=60&pool_timeout=60'
    }
  }
});

async function checkDatabase() {
  console.log('正在连接到数据库...\n');

  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ Prisma 数据库连接成功\n');

    // 1. 查询记录数
    console.log('=== 1. biz_sample 表记录数 ===');
    const totalCount = await prisma.biz_sample.count();
    console.log(`记录总数: ${totalCount}\n`);

    // 2. 查看表结构（从 Prisma Schema）
    console.log('=== 2. biz_sample 表结构 (Prisma Schema) ===');
    console.log('根据 prisma/schema.prisma:');
    console.log('  id                String   @id @default(cuid())');
    console.log('  sampleNo          String   @unique @db.VarChar(50)');
    console.log('  entrustmentId     String?  @db.VarChar(50)');
    console.log('  receiptId         String?  @db.VarChar(50)');
    console.log('  name              String   @db.VarChar(200)');
    console.log('  type              String?  @db.VarChar(50)');
    console.log('  specification     String?  @db.VarChar(200)');
    console.log('  material          String?  @db.VarChar(100)');
    console.log('  quantity          String?  @db.VarChar(50)');
    console.log('  totalQuantity     String?  @db.VarChar(50)');
    console.log('  unit              String?  @db.VarChar(20)');
    console.log('  receiptDate       DateTime?');
    console.log('  receiptPerson     String?  @db.VarChar(50)');
    console.log('  storageLocation   String?  @db.VarChar(200)');
    console.log('  remainingQuantity String?  @db.VarChar(50)');
    console.log('  status            String   @default("received")');
    console.log('  isOutsourced      Boolean  @default(false)');
    console.log('  remark            String?  @db.Text');
    console.log('  createdById       String?');
    console.log('  createdBy         User?    @relation(...)');
    console.log('  createdAt         DateTime @default(now())');
    console.log('  updatedAt         DateTime @updatedAt');
    console.log('');

    // 3. 查看最近5条记录
    console.log('=== 3. 最近5条记录 ===');
    const recentSamples = await prisma.biz_sample.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        sampleNo: true,
        name: true,
        type: true,
        quantity: true,
        unit: true,
        status: true,
        createdAt: true
      }
    });

    if (recentSamples.length === 0) {
      console.log('⚠️  表中暂无数据\n');
    } else {
      recentSamples.forEach((sample, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ID:         ${sample.id}`);
        console.log(`  样品编号:    ${sample.sampleNo || '(空)'}`);
        console.log(`  样品名称:    ${sample.name || '(空)'}`);
        console.log(`  样品类型:    ${sample.type || '(空)'}`);
        console.log(`  数量:        ${sample.quantity || '(空)'}`);
        console.log(`  单位:        ${sample.unit || '(空)'}`);
        console.log(`  状态:        ${sample.status}`);
        console.log(`  创建时间:    ${sample.createdAt.toLocaleString('zh-CN')}`);
      });
      console.log('');
    }

    // 4. 数据质量检查
    console.log('=== 4. 数据质量检查 ===');

    // 状态分布
    const statusGroups = await prisma.biz_sample.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n状态分布:');
    statusGroups.forEach(group => {
      console.log(`  ${group.status}: ${group._count.status} 条`);
    });

    // 检查必填字段
    const invalidCount = await prisma.biz_sample.count({
      where: {
        OR: [
          { sampleNo: null },
          { name: null },
          { status: null }
        ]
      }
    });
    console.log(`\n必填字段为空的记录数: ${invalidCount}`);

    // 检查重复的 sampleNo
    const duplicateSamples = await prisma.biz_sample.groupBy({
      by: ['sampleNo'],
      having: {
        sampleNo: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        sampleNo: true
      }
    });

    if (duplicateSamples.length > 0) {
      console.log(`\n⚠️  发现重复的样品编号:`);
      duplicateSamples.forEach(dup => {
        console.log(`  ${dup.sampleNo}: ${dup._count.sampleNo} 条`);
      });
    } else {
      console.log('\n✅ 未发现重复的样品编号');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    console.error('\n详细错误信息:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('\n数据库连接已关闭');
  }
}

checkDatabase().catch(console.error);
