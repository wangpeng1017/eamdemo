const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const consultation = await prisma.consultation.findFirst({
      where: { consultationNo: 'ZX202602020001' }
    });

    if (!consultation) {
      console.log('Consultation not found');
      process.exit(1);
    }

    console.log('Consultation ID:', consultation.id);
    console.log('Status:', consultation.status);

    const assessments = await prisma.consultationSampleAssessment.findMany({
      where: { consultationId: consultation.id },
      include: {
        sampleTestItem: {
          select: {
            sampleName: true,
            testItemName: true
          }
        }
      }
    });

    console.log('\nAssessment count:', assessments.length);
    assessments.forEach((a, i) => {
      console.log(`\nRecord ${i+1}:`);
      console.log('  Sample:', a.sampleTestItem.sampleName);
      console.log('  Test Item:', a.sampleTestItem.testItemName);
      console.log('  Assessor:', a.assessorName);
      console.log('  Feasibility:', a.feasibility);
      console.log('  RequestedBy:', a.requestedBy || '(null)');
      console.log('  RequestedAt:', a.requestedAt);
      console.log('  AssessedAt:', a.assessedAt);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
