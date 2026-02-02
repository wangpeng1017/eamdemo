const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Starting backfill for requestedBy field...\n');

    // 查询所有 requestedBy 为 null 的评估记录
    const assessments = await prisma.consultationSampleAssessment.findMany({
      where: {
        requestedBy: null
      },
      include: {
        consultation: {
          select: {
            consultationNo: true,
            follower: true
          }
        }
      }
    });

    console.log(`Found ${assessments.length} assessment records without requestedBy\n`);

    if (assessments.length === 0) {
      console.log('No records to update. Exiting.');
      await prisma.$disconnect();
      return;
    }

    // 批量更新
    let updated = 0;
    for (const assessment of assessments) {
      const requestedBy = assessment.consultation.follower || 'system';

      await prisma.consultationSampleAssessment.update({
        where: { id: assessment.id },
        data: { requestedBy }
      });

      console.log(`Updated assessment ${assessment.id}`);
      console.log(`  Consultation: ${assessment.consultation.consultationNo}`);
      console.log(`  RequestedBy: ${requestedBy}\n`);
      updated++;
    }

    console.log(`\nBackfill completed! Updated ${updated} records.`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
