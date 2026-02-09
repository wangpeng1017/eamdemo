'use client'

/**
 * @file 委托单打印组件
 * @desc 严格还原 Excel 模板「测试申请表-通用.xls」的打印布局
 *       双语标题、表格边框、签章区
 */

import React, { forwardRef } from 'react'

interface SampleItem {
    name: string
    partNo?: string
    material?: string
    color?: string
    weight?: string
    supplier?: string
    oem?: string
    quantity: number | string
    sampleCondition?: string
    remark?: string
}

interface TestItem {
    sampleIndex?: string
    sampleName?: string
    testItemName: string
    testStandard?: string
    testMethod?: string
    judgmentStandard?: string
    samplingLocation?: string
    specimenCount?: string
    testRemark?: string
    testCategory?: string
    // 材料级
    materialName?: string
    materialCode?: string
    materialSupplier?: string
    materialSpec?: string
    materialSampleStatus?: string
}

export interface PrintData {
    entrustmentNo: string
    clientName?: string
    contactPerson?: string
    contactPhone?: string
    contactFax?: string
    contactEmail?: string
    clientAddress?: string
    invoiceTitle?: string
    taxId?: string
    serviceScope?: string
    reportLanguage?: string
    urgencyLevel?: string
    reportCopies?: number
    reportDelivery?: string
    acceptSubcontract?: boolean
    isSampleReturn?: boolean
    testType?: string
    oemFactory?: string
    sampleDeliveryMethod?: string
    specialRequirements?: string
    samples: SampleItem[]
    componentTests: TestItem[]
    materialTests: TestItem[]
}

// 打印样式
const printStyles = `
@media print {
  body * { visibility: hidden; }
  #entrustment-print, #entrustment-print * { visibility: visible; }
  #entrustment-print { position: absolute; left: 0; top: 0; width: 100%; }
  @page { size: A4 landscape; margin: 10mm; }
}
`

const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 5px',
    fontSize: '9px',
    lineHeight: '1.3',
    verticalAlign: 'middle',
}

const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
}

const labelMap: Record<string, string> = {
    cn: '中文',
    en: 'English',
    cn_en: '中英文',
    normal: '常规 Normal',
    express: '加急(+50%)',
    double: '双倍加急(+100%)',
    urgent: '特急(+150%)',
    courier: '快递',
    electronic: '电子版',
    pickup: '自取',
    DV: 'DV',
    PV: 'PV',
    DV_PV: 'DV/PV 二合一',
    pilot: '摸底试验',
    annual: '年度试验',
    customer: '客户送样',
    logistics: '物流/快递',
    agency: '中介公司',
    other: '其他',
}

const EntrustmentPrint = forwardRef<HTMLDivElement, { data: PrintData }>(({ data }, ref) => {
    const componentTests = data.componentTests || []
    const materialTests = data.materialTests || []
    const samples = data.samples || []
    const scopeArr = data.serviceScope?.split(',') || []

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            <div id="entrustment-print" ref={ref} style={{ fontFamily: 'SimSun, serif', padding: '10px', maxWidth: '1100px', margin: '0 auto' }}>

                {/* 表头 */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>
                        Service Order / 第三方测试委托单
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                        表单编号 No.: <strong>{data.entrustmentNo}</strong>
                    </div>
                </div>

                {/* 基本信息表格 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>委托单位 Applicant</td>
                            <td style={{ ...cellStyle, width: '35%' }}>{data.clientName || ''}</td>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>联系人 Person</td>
                            <td style={{ ...cellStyle, width: '35%' }}>{data.contactPerson || ''}</td>
                        </tr>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>电话 Telephone</td>
                            <td style={cellStyle}>{data.contactPhone || ''}</td>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>传真 Fax</td>
                            <td style={cellStyle}>{data.contactFax || ''}</td>
                        </tr>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>地址 Address</td>
                            <td colSpan={3} style={cellStyle}>{data.clientAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>开票抬头</td>
                            <td style={cellStyle}>{data.invoiceTitle || ''}</td>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>税号</td>
                            <td style={cellStyle}>{data.taxId || ''}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 服务项目 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>●服务项目</td>
                            <td style={{ ...cellStyle, width: '20%' }}>
                                {scopeArr.includes('CMA') ? '☑' : '☐'} CMA &nbsp;&nbsp;
                                {scopeArr.includes('CNAS') ? '☑' : '☐'} CNAS
                            </td>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>●报告语言</td>
                            <td style={{ ...cellStyle, width: '20%' }}>{labelMap[data.reportLanguage || 'cn'] || data.reportLanguage}</td>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>●服务类型</td>
                            <td style={{ ...cellStyle, width: '15%' }}>{labelMap[data.urgencyLevel || 'normal'] || data.urgencyLevel}</td>
                        </tr>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>●报告份数</td>
                            <td style={cellStyle}>{data.reportCopies || 1}</td>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>●报告领取</td>
                            <td style={cellStyle}>{labelMap[data.reportDelivery || ''] || data.reportDelivery || ''}</td>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>●分包声明</td>
                            <td style={cellStyle}>{data.acceptSubcontract !== false ? '接受' : '不接受'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 样品信息表 */}
                <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '6px 0 3px' }}>●样品信息 Sample Information</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <thead>
                        <tr>
                            {['No.', '样品名称\nSample Name', '零件号\nPart No.', '材质\nMaterial', '颜色\nColor', '重量\nWeight', '供应商\nSupplier', 'OEM', '数量\nQty', '样品状态\nStatus', '备注\nRemark'].map((h, i) => (
                                <th key={i} style={{ ...headerCellStyle, whiteSpace: 'pre-line', width: i === 0 ? '4%' : undefined }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {samples.length > 0 ? samples.map((s, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                <td style={cellStyle}>{s.name}</td>
                                <td style={cellStyle}>{s.partNo || ''}</td>
                                <td style={cellStyle}>{s.material || ''}</td>
                                <td style={cellStyle}>{s.color || ''}</td>
                                <td style={cellStyle}>{s.weight || ''}</td>
                                <td style={cellStyle}>{s.supplier || ''}</td>
                                <td style={cellStyle}>{s.oem || ''}</td>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{s.quantity}</td>
                                <td style={cellStyle}>{s.sampleCondition || ''}</td>
                                <td style={cellStyle}>{s.remark || ''}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={11} style={{ ...cellStyle, textAlign: 'center', height: '30px' }}>—</td></tr>
                        )}
                    </tbody>
                </table>

                {/* 特殊要求 */}
                {data.specialRequirements && (
                    <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '6px', fontSize: '9px' }}>
                        <strong>●特殊要求 Special Requirements：</strong>{data.specialRequirements}
                    </div>
                )}

                {/* 试验类型/送样方式 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>●试验类型</td>
                            <td style={{ ...cellStyle, width: '35%' }}>{labelMap[data.testType || ''] || data.testType || ''}</td>
                            <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>●主机厂</td>
                            <td style={{ ...cellStyle, width: '35%' }}>{data.oemFactory || ''}</td>
                        </tr>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>●送样方式</td>
                            <td style={cellStyle}>{labelMap[data.sampleDeliveryMethod || ''] || data.sampleDeliveryMethod || ''}</td>
                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>●是否退样</td>
                            <td style={cellStyle}>{data.isSampleReturn ? '是' : '否'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 零部件级测试要求 */}
                {componentTests.length > 0 && (
                    <>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '6px 0 3px' }}>●零部件级测试要求 Component Test Requirement</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                            <thead>
                                <tr>
                                    {['No.', '样品名称', '测试项目\nTest Item', '测试标准\nStandard', '测试方法/条件', '判定依据', '取样位置/样品描述', '送检数量', '备注\nRemark'].map((h, i) => (
                                        <th key={i} style={{ ...headerCellStyle, whiteSpace: 'pre-line', width: i === 0 ? '4%' : undefined }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {componentTests.map((t, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={cellStyle}>{t.sampleName || ''}</td>
                                        <td style={cellStyle}>{t.testItemName}</td>
                                        <td style={cellStyle}>{t.testStandard || ''}</td>
                                        <td style={cellStyle}>{t.testMethod || ''}</td>
                                        <td style={cellStyle}>{t.judgmentStandard || ''}</td>
                                        <td style={cellStyle}>{t.samplingLocation || ''}</td>
                                        <td style={cellStyle}>{t.specimenCount || ''}</td>
                                        <td style={cellStyle}>{t.testRemark || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* 材料级测试要求 */}
                {materialTests.length > 0 && (
                    <>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '6px 0 3px' }}>●材料级测试要求 Material Test Requirement</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                            <thead>
                                <tr>
                                    {['No.', '材料名称', '材料牌号', '测试项目', '测试标准', '测试方法', '判定依据', '供应商', '规格', '样件状态', '数量', '备注'].map((h, i) => (
                                        <th key={i} style={{ ...headerCellStyle, whiteSpace: 'pre-line', width: i === 0 ? '4%' : undefined }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {materialTests.map((t, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={cellStyle}>{t.materialName || ''}</td>
                                        <td style={cellStyle}>{t.materialCode || ''}</td>
                                        <td style={cellStyle}>{t.testItemName}</td>
                                        <td style={cellStyle}>{t.testStandard || ''}</td>
                                        <td style={cellStyle}>{t.testMethod || ''}</td>
                                        <td style={cellStyle}>{t.judgmentStandard || ''}</td>
                                        <td style={cellStyle}>{t.materialSupplier || ''}</td>
                                        <td style={cellStyle}>{t.materialSpec || ''}</td>
                                        <td style={cellStyle}>{t.materialSampleStatus || ''}</td>
                                        <td style={cellStyle}>{t.specimenCount || ''}</td>
                                        <td style={cellStyle}>{t.testRemark || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* 声明条款 */}
                <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '8px', fontSize: '8px', lineHeight: '1.4' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>声明 Declaration：</div>
                    <div>1. 委托方应填写上述所有必要信息，并确保所提供的信息完整、准确。</div>
                    <div>2. 样品保存时间原则上不少于3个月，如对试验样品封样周期有特殊要求的，以正式版DVP或技术协议规定为准。</div>
                    <div>3. 复测项目单独出具报告，不允许出在原报告中。</div>
                    <div>4. 本中心按照行业标准分包给有检测资质的第三方实验室完成，经客户方同意后视为接受分包方出具的报告。</div>
                </div>

                {/* 签章区 */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, width: '33%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>客户签章 Customer Stamp：</div>
                                <div style={{ marginTop: '25px', fontSize: '8px' }}>日期 Date：____年____月____日</div>
                            </td>
                            <td style={{ ...cellStyle, width: '33%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>接收人签名 Received By：</div>
                                <div style={{ marginTop: '25px', fontSize: '8px' }}>日期 Date：____年____月____日</div>
                            </td>
                            <td style={{ ...cellStyle, width: '34%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>测试主管签名 Supervisor：</div>
                                <div style={{ marginTop: '25px', fontSize: '8px' }}>日期 Date：____年____月____日</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </>
    )
})

EntrustmentPrint.displayName = 'EntrustmentPrint'
export default EntrustmentPrint
