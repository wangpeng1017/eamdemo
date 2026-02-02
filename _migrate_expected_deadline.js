const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('开始数据迁移：expectedDeadline → clientReportDeadline\n');

    // 查询所有有 expectedDeadline 值的咨询记录
    const consultations = await prisma.$queryRaw`
      SELECT id, consultationNo, expectedDeadline, clientReportDeadline
      FROM biz_consultation
      WHERE expectedDeadline IS NOT NULL
    `;

    console.log(`找到 ${consultations.length} 条需要迁移的记录\n`);

    if (consultations.length === 0) {
      console.log('没有需要迁移的数据。');
      await prisma.$disconnect();
      return;
    }

    // 批量更新
    let updated = 0;
    for (const consultation of consultations) {
      // 只有当 clientReportDeadline 为空时才迁移
      if (!consultation.clientReportDeadline) {
        await prisma.$executeRaw`
          UPDATE biz_consultation
          SET clientReportDeadline = ${consultation.expectedDeadline}
          WHERE id = ${consultation.id}
        `;

        console.log(`✅ 迁移成功: ${consultation.consultationNo}`);
        console.log(`   expectedDeadline: ${consultation.expectedDeadline}`);
        console.log(`   → clientReportDeadline: ${consultation.expectedDeadline}\n`);
        updated++;
      } else {
        console.log(`⏭️  跳过 ${consultation.consultationNo}: clientReportDeadline 已有值\n`);
      }
    }

    console.log(`\n✅ 数据迁移完成！共更新 ${updated} 条记录。`);
    console.log('下一步：删除 expectedDeadline 列');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
