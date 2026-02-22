'use client'

/**
 * @file 委托单打印组件
 * @desc 严格还原 Excel 模板「测试申请表-通用.xls」的打印布局
 *       双语标题、表格边框、签章区、零部件/材料级测试
 *       全局字号 11pt，A4 横版打印
 */

import React, { forwardRef } from 'react'
import { getDefaultPrintTerms } from '@/lib/entrustment-defaults'

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
    vehicleModel?: string
    manufactureDate?: string
    manufactureLotNo?: string
    packingDate?: string
    projectDeadline?: string
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
    reportDeliveryAddress?: string
    acceptSubcontract?: boolean
    isSampleReturn?: boolean
    testType?: string
    oemFactory?: string
    sampleDeliveryMethod?: string
    specialRequirements?: string
    samples: SampleItem[]
    componentTests: TestItem[]
    materialTests: TestItem[]
    printTerms?: string | any
}

// 打印样式
const printStyles = `
@media print {
  body * { visibility: hidden; }
  #entrustment-print-wrapper {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    z-index: 99999 !important;
    overflow: visible !important;
  }
  #entrustment-print, #entrustment-print * { visibility: visible; }
  #entrustment-print {
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    padding: 10mm !important;
    box-sizing: border-box !important;
  }
  /* margin:0 消除浏览器默认页眉页脚 */
  @page { size: A4 landscape; margin: 0; }
}
`

// ================= 样式常量 =================
// 全局基准字号 11pt = 14.67px ≈ 15px
const FONT_SIZE = '11pt'
const FONT_SIZE_SMALL = '9pt'     // 英文副标题
const FONT_SIZE_TITLE = '18pt'    // 主标题
const FONT_SIZE_SUB = '14pt'      // 副标题
const FONT_SIZE_NOTES = '9pt'     // 底部注释
const FONT_SIZE_SECTION = '11pt'  // 区块标题

// 基础单元格样式
const cell: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 5px',
    fontSize: FONT_SIZE,
    lineHeight: '1.4',
    verticalAlign: 'middle',
}

// 表头单元格
const thCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    whiteSpace: 'pre-line',
    fontSize: FONT_SIZE,
}

// 标签单元格（左侧标题列）
const labelCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
}

// 勾选框
const Chk = ({ checked }: { checked: boolean }) => (
    <span style={{ fontFamily: 'serif', marginRight: 4, fontSize: FONT_SIZE }}>{checked ? '☑' : '☐'}</span>
)

const EntrustmentPrint = forwardRef<HTMLDivElement, { data: PrintData }>(({ data }, ref) => {
    const componentTests = data.componentTests || []
    const materialTests = data.materialTests || []
    const samples = data.samples || []
    const scopeArr = data.serviceScope?.split(',') || []

    // 解析打印声明条款
    const defaultTerms = getDefaultPrintTerms()
    let terms = defaultTerms
    if (data.printTerms) {
        const pt = typeof data.printTerms === 'string' ? JSON.parse(data.printTerms) : data.printTerms
        terms = { ...defaultTerms, ...pt }
    }

    // 填充空行保证最少行数
    const padRows = (arr: any[], min: number) => {
        const result = [...arr]
        while (result.length < min) result.push(null)
        return result
    }

    const paddedSamples = padRows(samples, 4)
    const paddedComponent = padRows(componentTests, 6)
    const paddedMaterial = padRows(materialTests, 5)

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            <div id="entrustment-print" ref={ref} style={{
                fontFamily: 'SimSun, "宋体", serif',
                padding: '8px',
                maxWidth: '1100px',
                margin: '0 auto',
                color: '#000',
                fontSize: FONT_SIZE,
            }}>

                {/* ========== 表头 ========== */}
                <div style={{ textAlign: 'center', marginBottom: '6px', position: 'relative' }}>
                    <div style={{ fontSize: FONT_SIZE_TITLE, fontWeight: 'bold', letterSpacing: '3px' }}>
                        Service Order
                    </div>
                    <div style={{ fontSize: FONT_SIZE_SUB, fontWeight: 'bold', letterSpacing: '2px' }}>
                        样品测试委托单
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, fontSize: FONT_SIZE }}>
                        表单编号 No.: <strong>{data.entrustmentNo}</strong>
                    </div>
                </div>

                {/* ========== 提示行 ========== */}
                <div style={{ fontSize: FONT_SIZE_SMALL, marginBottom: '4px', color: '#333' }}>
                    请用中文/英文完整填写，带●的栏目为必填项目 Please fulfill in Chinese/English, column with ● must be filled in.
                </div>

                {/* ========== 1. 申请方信息 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={5} style={{ ...labelCell, width: '5%', textAlign: 'center', fontSize: FONT_SIZE, writingMode: 'vertical-rl', letterSpacing: '2px' }}>●申<br />请<br />方<br />信<br />息</td>
                            <td style={{ ...labelCell, width: '13%' }}>●委托单位<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Applicant Name</span></td>
                            <td style={{ ...cell, width: '32%' }}>{data.clientName || ''}</td>
                            <td style={{ ...labelCell, width: '13%' }}>●联系人<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Contact Person</span></td>
                            <td style={{ ...cell, width: '37%' }}>{data.contactPerson || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●电话<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Telephone</span></td>
                            <td style={cell}>{data.contactPhone || ''}</td>
                            <td style={labelCell}>●邮箱/传真<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Email/Fax</span></td>
                            <td style={cell}>{data.contactEmail || ''}{data.contactFax ? ` / ${data.contactFax}` : ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●地址<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Address</span></td>
                            <td colSpan={3} style={cell}>{data.clientAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●发票抬头<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Invoice Title</span></td>
                            <td style={cell}>{data.invoiceTitle || ''}</td>
                            <td style={labelCell}>●税号<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Tax ID</span></td>
                            <td style={cell}>{data.taxId || ''}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 2. 报告要求 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ ...labelCell, width: '5%', textAlign: 'center', writingMode: 'vertical-rl', letterSpacing: '2px' }}>●<br />报<br />告<br />要<br />求</td>
                            <td style={{ ...labelCell, width: '13%' }}>●报告语种<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Report Language</span></td>
                            <td style={{ ...cell, width: '32%' }}>
                                <Chk checked={data.reportLanguage === 'cn'} /> 中文 &nbsp;
                                <Chk checked={data.reportLanguage === 'en'} /> English &nbsp;
                                <Chk checked={data.reportLanguage === 'cn_en'} /> 中英文对照
                            </td>
                            <td style={{ ...labelCell, width: '13%' }}>●服务类型<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Service Type</span></td>
                            <td style={{ ...cell, width: '37%' }}>
                                <Chk checked={data.urgencyLevel === 'normal'} /> 常规 &nbsp;
                                <Chk checked={data.urgencyLevel === 'express'} /> 加急(+50%) &nbsp;
                                <Chk checked={data.urgencyLevel === 'double'} /> 双倍加急(+100%) &nbsp;
                                <Chk checked={data.urgencyLevel === 'urgent'} /> 特急(+150%)
                            </td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●服务项目<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Scope of Service</span></td>
                            <td style={cell}>
                                <Chk checked={scopeArr.includes('CMA')} /> CMA &nbsp;
                                <Chk checked={scopeArr.includes('CNAS')} /> CNAS
                            </td>
                            <td style={labelCell}>报告份数<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Report Copies</span></td>
                            <td style={cell}>{data.reportCopies || 1}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 3. 寄送要求 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ ...labelCell, width: '5%', textAlign: 'center', writingMode: 'vertical-rl', letterSpacing: '2px' }}>●<br />寄<br />送<br />要<br />求</td>
                            <td style={{ ...labelCell, width: '13%' }}>●报告送递<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Report Delivery</span></td>
                            <td style={{ ...cell, width: '32%' }}>
                                <Chk checked={data.reportDelivery === 'fax'} /> 传真 &nbsp;
                                <Chk checked={data.reportDelivery === 'email'} /> 电邮 &nbsp;
                                <Chk checked={data.reportDelivery === 'pickup'} /> 自取 &nbsp;
                                <Chk checked={data.reportDelivery === 'courier'} /> 快递到付
                            </td>
                            <td style={{ ...labelCell, width: '13%' }}>●寄送地址<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Delivery Address</span></td>
                            <td style={{ ...cell, width: '37%' }}>{data.reportDeliveryAddress || data.clientAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●退回样品<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Return Sample</span></td>
                            <td style={cell}>
                                <Chk checked={data.isSampleReturn === true} /> 需要（邮费自付） &nbsp;
                                <Chk checked={data.isSampleReturn !== true} /> 不需要
                            </td>
                            <td style={labelCell}>是否接受分包<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Subcontracting</span></td>
                            <td style={cell}>
                                <Chk checked={data.acceptSubcontract !== false} /> 接受 &nbsp;
                                <Chk checked={data.acceptSubcontract === false} /> 不接受
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 4. 样品信息 ========== */}
                <div style={{ fontSize: FONT_SIZE_SECTION, fontWeight: 'bold', margin: '6px 0 3px' }}>●样品信息 Sample Information</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <thead>
                        <tr>
                            {[
                                { label: 'No.\n样品序号', w: '4%' },
                                { label: 'Sample Name\n●样品名称', w: '14%' },
                                { label: 'Part No.\n●零件号', w: '10%' },
                                { label: 'Supplier & Address\n●生产商(全称)及地址', w: '16%' },
                                { label: 'Vehicle Model\n●车型', w: '8%' },
                                { label: 'Manufacture Date\n●生产日期', w: '9%' },
                                { label: 'Manufacture Lot No\n●生产批号', w: '9%' },
                                { label: 'Packing Date\n●包装日期', w: '9%' },
                                { label: 'Date required\n●项目节点日期', w: '9%' },
                                { label: 'Remark\n备注', w: '12%' },
                            ].map((h, i) => (
                                <th key={i} style={{ ...thCell, width: h.w }}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paddedSamples.map((s, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cell, textAlign: 'center' }}>{idx + 1}</td>
                                <td style={cell}>{s?.name || ''}</td>
                                <td style={cell}>{s?.partNo || ''}</td>
                                <td style={cell}>{s?.supplier || ''}</td>
                                <td style={cell}>{s?.vehicleModel || ''}</td>
                                <td style={cell}>{s?.manufactureDate || ''}</td>
                                <td style={cell}>{s?.manufactureLotNo || ''}</td>
                                <td style={cell}>{s?.packingDate || ''}</td>
                                <td style={cell}>{s?.projectDeadline || ''}</td>
                                <td style={cell}>{s?.remark || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ========== 5. 试验类型/送样方式 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '10%' }}>●试验类型</td>
                            <td style={{ ...cell, width: '90%' }} colSpan={5}>
                                <Chk checked={data.testType === 'DV'} /> DV &nbsp;&nbsp;
                                <Chk checked={data.testType === 'PV'} /> PV &nbsp;&nbsp;
                                <Chk checked={data.testType === 'DV_PV'} /> DV/PV二合一 &nbsp;&nbsp;
                                <Chk checked={data.testType === 'pilot'} /> 摸底试验 &nbsp;&nbsp;
                                <Chk checked={data.testType === 'annual'} /> 年度试验
                            </td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●主机厂</td>
                            <td colSpan={5} style={cell}>{data.oemFactory || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●送样方式</td>
                            <td colSpan={5} style={cell}>
                                <Chk checked={data.sampleDeliveryMethod === 'customer'} /> 客户送样 &nbsp;&nbsp;
                                <Chk checked={data.sampleDeliveryMethod === 'logistics'} /> 物流/快递 &nbsp;&nbsp;
                                <Chk checked={data.sampleDeliveryMethod === 'agency'} /> 中介公司 &nbsp;&nbsp;
                                <Chk checked={data.sampleDeliveryMethod === 'other'} /> 其他
                            </td>
                        </tr>
                        <tr>
                            <td style={labelCell}>样品管理规定</td>
                            <td colSpan={5} style={cell}>{terms.sampleRule}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 6. 零部件级测试要求 ========== */}
                <div style={{ fontSize: FONT_SIZE_SECTION, fontWeight: 'bold', margin: '6px 0 3px' }}>●零部件级测试要求 Component Level Test Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <thead>
                        <tr>
                            {[
                                { label: 'Sample No.\n样品序号', w: '5%' },
                                { label: '●样品名称\nSample Name', w: '12%' },
                                { label: '●测试项目\nTest Item', w: '12%' },
                                { label: '●测试标准\nTest Standard', w: '12%' },
                                { label: '●测试方法、条件\nTest Method', w: '12%' },
                                { label: '●判定依据\nAssessment', w: '15%' },
                                { label: '●取样位置/样品描述\nSampling Location', w: '14%' },
                                { label: '送检数量\nSpecimen', w: '6%' },
                                { label: '备注\nRemark', w: '12%' },
                            ].map((h, i) => (
                                <th key={i} style={{ ...thCell, width: h.w }}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paddedComponent.map((t, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cell, textAlign: 'center' }}>{t ? (t.sampleIndex || idx + 1) : idx + 1}</td>
                                <td style={cell}>{t?.sampleName || ''}</td>
                                <td style={cell}>{t?.testItemName || ''}</td>
                                <td style={cell}>{t?.testStandard || ''}</td>
                                <td style={cell}>{t?.testMethod || ''}</td>
                                <td style={cell}>{t?.judgmentStandard || ''}</td>
                                <td style={cell}>{t?.samplingLocation || ''}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{t?.specimenCount || ''}</td>
                                <td style={cell}>{t?.testRemark || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ========== 7. 材料级测试要求 ========== */}
                <div style={{ fontSize: FONT_SIZE_SECTION, fontWeight: 'bold', margin: '6px 0 3px' }}>●材料级测试要求 Material Level Test Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <thead>
                        <tr>
                            {[
                                { label: 'Sample No.\n样品序号', w: '4%' },
                                { label: '●材料名称(材质)\nMaterial', w: '10%' },
                                { label: '●材料牌号\nCode', w: '8%' },
                                { label: '●测试项目\nTest Item', w: '10%' },
                                { label: '●测试标准\nStandard', w: '10%' },
                                { label: '●测试方法、条件\nTest Method', w: '10%' },
                                { label: '●判定依据\nAssessment', w: '12%' },
                                { label: '●材料供应商\nSupplier', w: '8%' },
                                { label: '●材料规格\nType/Code', w: '8%' },
                                { label: '●样件状态\nStatus', w: '6%' },
                                { label: '送检数量\nSpecimen', w: '5%' },
                                { label: '备注\nRemark', w: '9%' },
                            ].map((h, i) => (
                                <th key={i} style={{ ...thCell, width: h.w }}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paddedMaterial.map((t, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cell, textAlign: 'center' }}>{t ? (t.sampleIndex || idx + 1) : idx + 1}</td>
                                <td style={cell}>{t?.materialName || ''}</td>
                                <td style={cell}>{t?.materialCode || ''}</td>
                                <td style={cell}>{t?.testItemName || ''}</td>
                                <td style={cell}>{t?.testStandard || ''}</td>
                                <td style={cell}>{t?.testMethod || ''}</td>
                                <td style={cell}>{t?.judgmentStandard || ''}</td>
                                <td style={cell}>{t?.materialSupplier || ''}</td>
                                <td style={cell}>{t?.materialSpec || ''}</td>
                                <td style={cell}>{t?.materialSampleStatus || ''}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{t?.specimenCount || ''}</td>
                                <td style={cell}>{t?.testRemark || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ========== 8. 附件说明 ========== */}
                <div style={{ fontSize: FONT_SIZE, marginBottom: '3px', lineHeight: '1.4' }}>
                    {terms.attachmentNote}
                </div>

                {/* ========== 9. 周期说明 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '10%', verticalAlign: 'top', textAlign: 'center' }}>●<br />周期说明</td>
                            <td style={{ ...cell, lineHeight: '1.5', whiteSpace: 'pre-line' }}>{terms.cycleDesc}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 10. 分包声明 ========== */}
                <div style={{ border: '1px solid #000', padding: '3px 6px', fontSize: FONT_SIZE, marginBottom: '0', lineHeight: '1.5' }}>
                    <Chk checked={data.acceptSubcontract === false} />
                    {terms.subcontractStatement}
                </div>

                {/* ========== 11. 费用声明 ========== */}
                <div style={{ border: '1px solid #000', borderTop: 'none', padding: '3px 6px', fontSize: FONT_SIZE, marginBottom: '6px', lineHeight: '1.5' }}>
                    ●{terms.feeStatement}
                </div>

                {/* ========== 12. 签章区 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cell, width: '33%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>●客户盖章及签名<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Customer seal and signature</span></div>
                                <div style={{ marginTop: '24px' }}>Date日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '33%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>●接收人签名<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Accepter signature</span></div>
                                <div style={{ marginTop: '24px' }}>Date日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '34%', height: '60px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>●测试主管签名<br /><span style={{ fontWeight: 'normal', fontSize: FONT_SIZE_SMALL }}>Supervisor signature</span></div>
                                <div style={{ marginTop: '24px' }}>Date日期：____年____月____日</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 13. 底部注释 ========== */}
                <div style={{ fontSize: FONT_SIZE_NOTES, lineHeight: '1.6', color: '#333' }}>
                    <div style={{ fontWeight: 'bold' }}>Notes:</div>
                    {(terms.notes || []).map((note: any, idx: number) => (
                        <div key={idx}>{note.en} {note.zh}</div>
                    ))}
                </div>

            </div>
        </>
    )
})

EntrustmentPrint.displayName = 'EntrustmentPrint'
export default EntrustmentPrint
