/**
 * @file seed/route.ts
 * @desc 预置检测项目数据种子 API
 * @usage POST /api/test-template/seed
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 拉伸性能试验模版 - GB/T 3354-2014
const tensilePerformanceSchema = {
  title: '拉伸性能试验记录',
  header: {
    methodBasis: 'GB/T 3354-2014',
    sampleType: '纤维增强塑料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '标距 (mm)', dataIndex: 'gaugeLength', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '拉伸强度 (MPa)', dataIndex: 'tensileStrength', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '断后伸长率 (%)', dataIndex: 'elongation', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '弹性模量 (GPa)', dataIndex: 'elasticModulus', width: 140, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'tensileStrength', label: '拉伸强度平均值' },
    { type: 'std', column: 'tensileStrength', label: '拉伸强度标准差' },
    { type: 'cv', column: 'tensileStrength', label: '拉伸强度离散系数' },
    { type: 'avg', column: 'elongation', label: '断后伸长率平均值' },
    { type: 'avg', column: 'elasticModulus', label: '弹性模量平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 金属材料拉伸试验模版 - GB/T 228.1-2021
const metalTensileSchema = {
  title: '金属材料拉伸试验记录',
  header: {
    methodBasis: 'GB/T 228.1-2021',
    sampleType: '金属材料'
  },
  columns: [
    { title: '试样编号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '原始直径 d₀ (mm)', dataIndex: 'originalDiameter', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '原始截面积 S₀ (mm²)', dataIndex: 'originalArea', width: 160, dataType: 'number', validation: { min: 0 } },
    { title: '原始标距 L₀ (mm)', dataIndex: 'originalGaugeLength', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '断后标距 Lᵤ (mm)', dataIndex: 'finalGaugeLength', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '断后最小直径 dᵤ (mm)', dataIndex: 'finalDiameter', width: 170, dataType: 'number', validation: { min: 0 } },
    { title: '上屈服强度 ReH (MPa)', dataIndex: 'upperYieldStrength', width: 170, dataType: 'number', validation: { min: 0 } },
    { title: '下屈服强度 ReL (MPa)', dataIndex: 'lowerYieldStrength', width: 170, dataType: 'number', validation: { min: 0 } },
    { title: '抗拉强度 Rm (MPa)', dataIndex: 'tensileStrength', width: 160, dataType: 'number', validation: { min: 0 } },
    { title: '断后伸长率 A (%)', dataIndex: 'elongation', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '断面收缩率 Z (%)', dataIndex: 'reductionOfArea', width: 150, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'tensileStrength', label: '抗拉强度平均值' },
    { type: 'std', column: 'tensileStrength', label: '抗拉强度标准差' },
    { type: 'avg', column: 'upperYieldStrength', label: '上屈服强度平均值' },
    { type: 'avg', column: 'lowerYieldStrength', label: '下屈服强度平均值' },
    { type: 'avg', column: 'elongation', label: '断后伸长率平均值' },
    { type: 'avg', column: 'reductionOfArea', label: '断面收缩率平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 布氏硬度试验模版 - GB/T 231.1-2018
const brinellHardnessSchema = {
  title: '布氏硬度试验记录',
  header: {
    methodBasis: 'GB/T 231.1-2018',
    sampleType: '金属材料'
  },
  columns: [
    { title: '试样编号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '测试位置', dataIndex: 'testPosition', width: 120, dataType: 'string' },
    { title: '球直径 D (mm)', dataIndex: 'ballDiameter', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '试验力 F (N)', dataIndex: 'testForce', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '压痕直径 d₁ (mm)', dataIndex: 'indentDiameter1', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '压痕直径 d₂ (mm)', dataIndex: 'indentDiameter2', width: 150, dataType: 'number', validation: { min: 0 } },
    { title: '压痕平均直径 d (mm)', dataIndex: 'avgIndentDiameter', width: 170, dataType: 'number', validation: { min: 0 } },
    { title: '布氏硬度 HBW', dataIndex: 'hardnessHBW', width: 130, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'hardnessHBW', label: '布氏硬度平均值' },
    { type: 'std', column: 'hardnessHBW', label: '布氏硬度标准差' },
    { type: 'cv', column: 'hardnessHBW', label: '布氏硬度离散系数' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

const templates = [
  {
    code: 'TPL-TENSILE-3354',
    name: '拉伸性能试验',
    category: '力学性能',
    method: 'GB/T 3354-2014',
    schema: JSON.stringify(tensilePerformanceSchema),
    status: 'active',
  },
  {
    code: 'TPL-METAL-228',
    name: '金属材料拉伸试验',
    category: '力学性能',
    method: 'GB/T 228.1-2021',
    schema: JSON.stringify(metalTensileSchema),
    status: 'active',
  },
  {
    code: 'TPL-HARDNESS-231',
    name: '布氏硬度试验',
    category: '硬度测试',
    method: 'GB/T 231.1-2018',
    schema: JSON.stringify(brinellHardnessSchema),
    status: 'active',
  },
]

// 创建预置模版
export const POST = withErrorHandler(async (request: NextRequest) => {
  const results = []

  for (const template of templates) {
    const existing = await prisma.testTemplate.findUnique({
      where: { code: template.code }
    })

    if (existing) {
      const updated = await prisma.testTemplate.update({
        where: { code: template.code },
        data: template
      })
      results.push({ code: template.code, action: 'updated', name: template.name })
    } else {
      const created = await prisma.testTemplate.create({
        data: template
      })
      results.push({ code: template.code, action: 'created', name: template.name })
    }
  }

  return success({
    message: '预置模版创建/更新完成',
    results
  })
})

// 获取预置模版列表
export const GET = withErrorHandler(async () => {
  return success({
    templates: templates.map(t => ({
      code: t.code,
      name: t.name,
      category: t.category,
      method: t.method
    }))
  })
})
