const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const entrustments = await prisma.entrustment.findMany({ take: 10 })
  console.log('委托单数量:', entrustments.length)
  entrustments.forEach(e => console.log(e.entrustmentNo, e.clientName, e.status))

  const samples = await prisma.sample.findMany({ take: 10 })
  console.log('\n样品数量:', samples.length)
  samples.forEach(s => console.log(s.sampleNo, s.name, s.status))

  await prisma.$disconnect()
}

check().catch(e => { console.error(e); process.exit(1) })
