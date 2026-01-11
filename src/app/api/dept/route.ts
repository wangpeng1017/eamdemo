import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const isTree = searchParams.get('tree') === 'true'

  const list = await prisma.dept.findMany({
    orderBy: { sort: 'asc' },
    include: { _count: { select: { users: true } } }
  })

  if (isTree) {
    const buildTree = (parentId: string | null = null): any[] => {
      return list
        .filter(item => item.parentId === parentId)
        .map(item => ({
          key: item.id,
          title: item.name,
          value: item.id,
          children: buildTree(item.id),
          ...item
        }))
    }
    const tree = buildTree(null)
    return NextResponse.json({ success: true, data: tree })
  }

  return NextResponse.json({ success: true, list }) // Keep 'list' for backward compatibility or return standard structure
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const dept = await prisma.dept.create({ data })
  return NextResponse.json(dept)
}

export async function PUT(request: NextRequest) {
  const data = await request.json()
  const { id, ...updateData } = data
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  const dept = await prisma.dept.update({
    where: { id },
    data: updateData
  })
  return NextResponse.json(dept)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // support typical delete if passed by id in param or body?
  // The previous implementation used dynamic route [id] for delete. 
  // Wait, the previous file didn't populate DELETE/PUT in this file?
  // The previous file content shown in view_file was ONLY GET and POST. 
  // And there was a file `src/app/api/dept/[id]/route.ts`?
  // Let me check if [id] route exists.
  return NextResponse.json({ message: 'Use dynamic route for delete' })
}
