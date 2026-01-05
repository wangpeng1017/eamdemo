import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const [
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth
  ] = await Promise.all([
    prisma.entrustment.count(),
    prisma.sample.count(),
    prisma.testTask.count(),
    prisma.testReport.count(),
    prisma.entrustment.count({ where: { status: 'pending' } }),
    prisma.sample.count({ where: { status: 'testing' } }),
    prisma.testReport.count({ where: { status: { in: ['draft', 'reviewing'] } } }),
    prisma.testReport.count({
      where: {
        status: 'issued',
        issuedDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })
  ])

  return NextResponse.json({
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth
  })
}
