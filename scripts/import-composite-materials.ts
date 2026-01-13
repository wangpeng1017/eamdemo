/**
 * 复合材料检测项目数据导入脚本
 * 运行: npx ts-node --esm scripts/import-composite-materials.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 拉伸性能 - GB/T 3354-2014
const tensileGT3354 = {
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

// 拉伸性能 - ASTM D3039/D3039M-17
const tensileASTMD3039 = {
  title: '拉伸性能试验记录',
  header: {
    methodBasis: 'ASTM D3039/D3039M-17',
    sampleType: '聚合物基复合材料'
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
    { title: '泊松比', dataIndex: 'poissonRatio', width: 120, dataType: 'number', validation: { min: 0, max: 0.5 } },
  ],
  statistics: [
    { type: 'avg', column: 'tensileStrength', label: '拉伸强度平均值' },
    { type: 'std', column: 'tensileStrength', label: '拉伸强度标准差' },
    { type: 'cv', column: 'tensileStrength', label: '拉伸强度离散系数' },
    { type: 'avg', column: 'elongation', label: '断后伸长率平均值' },
    { type: 'avg', column: 'elasticModulus', label: '弹性模量平均值' },
    { type: 'avg', column: 'poissonRatio', label: '泊松比平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 压缩性能 - ASTM D6641/D6641M-23
const compressionASTMD6641 = {
  title: '压缩性能试验记录',
  header: {
    methodBasis: 'ASTM D6641/D6641M-23',
    sampleType: '聚合物基复合材料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '标距 (mm)', dataIndex: 'gaugeLength', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '压缩强度 (MPa)', dataIndex: 'compressiveStrength', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '压缩模量 (GPa)', dataIndex: 'compressiveModulus', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '破坏应变 (%)', dataIndex: 'failureStrain', width: 120, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'compressiveStrength', label: '压缩强度平均值' },
    { type: 'std', column: 'compressiveStrength', label: '压缩强度标准差' },
    { type: 'cv', column: 'compressiveStrength', label: '压缩强度离散系数' },
    { type: 'avg', column: 'compressiveModulus', label: '压缩模量平均值' },
    { type: 'avg', column: 'failureStrain', label: '破坏应变平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 弯曲性能 - GB/T 1449-2005
const flexuralGT1449 = {
  title: '弯曲性能试验记录',
  header: {
    methodBasis: 'GB/T 1449-2005',
    sampleType: '纤维增强塑料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '跨距 (mm)', dataIndex: 'span', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '弯曲强度 (MPa)', dataIndex: 'flexuralStrength', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '弯曲模量 (GPa)', dataIndex: 'flexuralModulus', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '最大挠度 (mm)', dataIndex: 'maxDeflection', width: 130, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'flexuralStrength', label: '弯曲强度平均值' },
    { type: 'std', column: 'flexuralStrength', label: '弯曲强度标准差' },
    { type: 'cv', column: 'flexuralStrength', label: '弯曲强度离散系数' },
    { type: 'avg', column: 'flexuralModulus', label: '弯曲模量平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 弯曲性能 - ASTM D7264/D7264M-21
const flexuralASTMD7264 = {
  title: '弯曲性能试验记录',
  header: {
    methodBasis: 'ASTM D7264/D7264M-21',
    sampleType: '聚合物基复合材料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '跨距 (mm)', dataIndex: 'span', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '弯曲强度 (MPa)', dataIndex: 'flexuralStrength', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '弯曲模量 (GPa)', dataIndex: 'flexuralModulus', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '最大挠度 (mm)', dataIndex: 'maxDeflection', width: 130, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'flexuralStrength', label: '弯曲强度平均值' },
    { type: 'std', column: 'flexuralStrength', label: '弯曲强度标准差' },
    { type: 'cv', column: 'flexuralStrength', label: '弯曲强度离散系数' },
    { type: 'avg', column: 'flexuralModulus', label: '弯曲模量平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 开孔拉伸性能 - ASTM D5766/D5766M-23
const openHoleTensileASTMD5766 = {
  title: '开孔拉伸性能试验记录',
  header: {
    methodBasis: 'ASTM D5766/D5766M-23',
    sampleType: '聚合物基复合材料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '孔径 (mm)', dataIndex: 'holeDiameter', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '标距 (mm)', dataIndex: 'gaugeLength', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '开孔拉伸强度 (MPa)', dataIndex: 'openHoleStrength', width: 160, dataType: 'number', validation: { min: 0 } },
    { title: '弹性模量 (GPa)', dataIndex: 'elasticModulus', width: 140, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'openHoleStrength', label: '开孔拉伸强度平均值' },
    { type: 'std', column: 'openHoleStrength', label: '开孔拉伸强度标准差' },
    { type: 'cv', column: 'openHoleStrength', label: '开孔拉伸强度离散系数' },
    { type: 'avg', column: 'elasticModulus', label: '弹性模量平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 面内剪切性能 - ASTM D3518/D3518M-18
const inPlaneShearASTMD3518 = {
  title: '面内剪切性能试验记录',
  header: {
    methodBasis: 'ASTM D3518/D3518M-18',
    sampleType: '聚合物基复合材料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '纤维角度 (°)', dataIndex: 'fiberAngle', width: 120, dataType: 'number', validation: { min: 0, max: 90 } },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '标距 (mm)', dataIndex: 'gaugeLength', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '剪切强度 (MPa)', dataIndex: 'shearStrength', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '剪切模量 (GPa)', dataIndex: 'shearModulus', width: 140, dataType: 'number', validation: { min: 0 } },
    { title: '剪切应变 (%)', dataIndex: 'shearStrain', width: 130, dataType: 'number', validation: { min: 0 } },
  ],
  statistics: [
    { type: 'avg', column: 'shearStrength', label: '剪切强度平均值' },
    { type: 'std', column: 'shearStrength', label: '剪切强度标准差' },
    { type: 'cv', column: 'shearStrength', label: '剪切强度离散系数' },
    { type: 'avg', column: 'shearModulus', label: '剪切模量平均值' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

// 短梁剪切性能 - ASTM D2344/D2344M-22
const shortBeamShearASTMD2344 = {
  title: '短梁剪切性能试验记录',
  header: {
    methodBasis: 'ASTM D2344/D2344M-22',
    sampleType: '聚合物基复合材料'
  },
  columns: [
    { title: '样品序号', dataIndex: 'sampleNo', width: 100, dataType: 'string' },
    { title: '宽度 (mm)', dataIndex: 'width', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '厚度 (mm)', dataIndex: 'thickness', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '跨距 (mm)', dataIndex: 'span', width: 120, dataType: 'number', validation: { min: 0 } },
    { title: '最大载荷 (N)', dataIndex: 'maxLoad', width: 130, dataType: 'number', validation: { min: 0 } },
    { title: '层间剪切强度 (MPa)', dataIndex: 'interlaminarStrength', width: 170, dataType: 'number', validation: { min: 0 } },
    { title: '破坏模式', dataIndex: 'failureMode', width: 140, dataType: 'string' },
  ],
  statistics: [
    { type: 'avg', column: 'interlaminarStrength', label: '层间剪切强度平均值' },
    { type: 'std', column: 'interlaminarStrength', label: '层间剪切强度标准差' },
    { type: 'cv', column: 'interlaminarStrength', label: '层间剪切强度离散系数' },
  ],
  environment: true,
  equipment: true,
  personnel: true,
  defaultRows: 5
}

const templates = [
  {
    code: 'CM-TENSILE-3354',
    name: '拉伸性能',
    category: '复合材料',
    method: 'GB/T 3354-2014',
    schema: JSON.stringify(tensileGT3354),
    status: 'active',
  },
  {
    code: 'CM-TENSILE-D3039',
    name: '拉伸性能',
    category: '复合材料',
    method: 'ASTM D3039/D3039M-17',
    schema: JSON.stringify(tensileASTMD3039),
    status: 'active',
  },
  {
    code: 'CM-COMP-D6641',
    name: '压缩性能',
    category: '复合材料',
    method: 'ASTM D6641/D6641M-23',
    schema: JSON.stringify(compressionASTMD6641),
    status: 'active',
  },
  {
    code: 'CM-FLEX-1449',
    name: '弯曲性能',
    category: '复合材料',
    method: 'GB/T 1449-2005',
    schema: JSON.stringify(flexuralGT1449),
    status: 'active',
  },
  {
    code: 'CM-FLEX-D7264',
    name: '弯曲性能',
    category: '复合材料',
    method: 'ASTM D7264/D7264M-21',
    schema: JSON.stringify(flexuralASTMD7264),
    status: 'active',
  },
  {
    code: 'CM-OHT-D5766',
    name: '开孔拉伸性能',
    category: '复合材料',
    method: 'ASTM D5766/D5766M-23',
    schema: JSON.stringify(openHoleTensileASTMD5766),
    status: 'active',
  },
  {
    code: 'CM-IPS-D3518',
    name: '面内剪切性能',
    category: '复合材料',
    method: 'ASTM D3518/D3518M-18',
    schema: JSON.stringify(inPlaneShearASTMD3518),
    status: 'active',
  },
  {
    code: 'CM-SBS-D2344',
    name: '短梁剪切性能',
    category: '复合材料',
    method: 'ASTM D2344/D2344M-22',
    schema: JSON.stringify(shortBeamShearASTMD2344),
    status: 'active',
  },
]

async function main() {
  console.log('开始导入复合材料检测项目数据...\n')

  for (const template of templates) {
    const existing = await prisma.testTemplate.findUnique({
      where: { code: template.code }
    })

    if (existing) {
      await prisma.testTemplate.update({
        where: { code: template.code },
        data: template
      })
      console.log(`✓ 更新: ${template.code} - ${template.name} (${template.method})`)
    } else {
      await prisma.testTemplate.create({
        data: template
      })
      console.log(`✓ 创建: ${template.code} - ${template.name} (${template.method})`)
    }
  }

  console.log('\n复合材料检测项目数据导入完成！')
  console.log(`总计: ${templates.length} 个检测项目`)
}

main()
  .catch((e) => {
    console.error('导入失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
