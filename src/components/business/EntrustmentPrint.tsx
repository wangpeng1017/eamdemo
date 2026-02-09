'use client'

/**
 * @file 委托单打印组件
 * @desc 严格还原 Excel 模板「测试申请表-通用.xls」的打印布局
 *       双语标题、表格边框、签章区、禁用物质/VOC/零部件/材料级测试
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
  #entrustment-print-wrapper {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    z-index: 99999 !important;
    overflow: visible !important;
  }
  #entrustment-print, #entrustment-print * { visibility: visible; }
  #entrustment-print {
    position: relative !important;
    left: 0;
    top: 0;
    width: 100%;
  }
  @page { size: A4 landscape; margin: 8mm; }
}
`

// 基础单元格样式
const cell: React.CSSProperties = {
    border: '1px solid #000',
    padding: '2px 4px',
    fontSize: '8px',
    lineHeight: '1.3',
    verticalAlign: 'middle',
}

// 标题单元格
const thCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    whiteSpace: 'pre-line',
}

// 标签单元格（左侧标题列）
const labelCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
}

// 勾选框
const Chk = ({ checked }: { checked: boolean }) => (
    <span style={{ fontFamily: 'serif', marginRight: 4 }}>{checked ? '☑' : '☐'}</span>
)

const EntrustmentPrint = forwardRef<HTMLDivElement, { data: PrintData }>(({ data }, ref) => {
    const componentTests = data.componentTests || []
    const materialTests = data.materialTests || []
    const samples = data.samples || []
    const scopeArr = data.serviceScope?.split(',') || []

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
            }}>

                {/* ========== 表头 ========== */}
                <div style={{ textAlign: 'center', marginBottom: '4px', position: 'relative' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px' }}>
                        Service Order
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>
                        样品检测委托单
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, fontSize: '9px' }}>
                        表单编号 No.: <strong>{data.entrustmentNo}</strong>
                    </div>
                </div>

                {/* ========== 1. 客户信息 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '14%' }}>●委托单位/项目名称<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Applicant/Project Name</span></td>
                            <td style={{ ...cell, width: '36%' }}>{data.clientName || ''}</td>
                            <td style={{ ...labelCell, width: '14%' }}>●联系人<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Contact Person</span></td>
                            <td style={{ ...cell, width: '36%' }}>{data.contactPerson || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●电话 Telephone</td>
                            <td style={cell}>{data.contactPhone || ''}</td>
                            <td style={labelCell}>●传真/邮箱<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Fax/E-mail</span></td>
                            <td style={cell}>{data.contactFax || data.contactEmail || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●地址 Address</td>
                            <td colSpan={3} style={cell}>{data.clientAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●开票抬头</td>
                            <td style={cell}>{data.invoiceTitle || ''}</td>
                            <td style={labelCell}>●税号</td>
                            <td style={cell}>{data.taxId || ''}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 2. 服务项目、报告语言、类型 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '14%' }}>●服务项目<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Scope of service</span></td>
                            <td style={{ ...cell, width: '19%' }}>
                                <Chk checked={scopeArr.includes('CMA')} /> CMA &nbsp;
                                <Chk checked={scopeArr.includes('CNAS')} /> CNAS
                            </td>
                            <td style={{ ...labelCell, width: '14%' }}>●报告语言<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Report language</span></td>
                            <td style={{ ...cell, width: '19%' }}>
                                <Chk checked={data.reportLanguage === 'cn'} /> 中文 &nbsp;
                                <Chk checked={data.reportLanguage === 'en'} /> English &nbsp;
                                <Chk checked={data.reportLanguage === 'cn_en'} /> 中英文
                            </td>
                            <td style={{ ...labelCell, width: '14%' }}>●服务类型<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Turnaround Time</span></td>
                            <td style={{ ...cell, width: '20%' }}>
                                <Chk checked={data.urgencyLevel === 'normal'} /> 常规 &nbsp;
                                <Chk checked={data.urgencyLevel === 'express'} /> 加急 &nbsp;
                                <Chk checked={data.urgencyLevel === 'double'} /> 双倍加急 &nbsp;
                                <Chk checked={data.urgencyLevel === 'urgent'} /> 特急
                            </td>
                        </tr>
                        <tr>
                            <td style={labelCell}>●报告份数<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Report copies</span></td>
                            <td style={cell}>{data.reportCopies || 1}</td>
                            <td style={labelCell}>●报告领取<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Report delivery</span></td>
                            <td style={cell}>
                                <Chk checked={data.reportDelivery === 'courier'} /> 快递 &nbsp;
                                <Chk checked={data.reportDelivery === 'electronic'} /> 电子版 &nbsp;
                                <Chk checked={data.reportDelivery === 'pickup'} /> 自取
                            </td>
                            <td style={labelCell}>●是否接受分包<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Accept Subcontracting</span></td>
                            <td style={cell}>
                                <Chk checked={data.acceptSubcontract !== false} /> 接受 &nbsp;
                                <Chk checked={data.acceptSubcontract === false} /> 不接受
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 3. 红色提示 ========== */}
                <div style={{
                    border: '1px solid #000',
                    borderTop: 'none',
                    padding: '3px 6px',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    color: '#c00',
                    textAlign: 'center',
                }}>
                    ★详细样品信息、测试要求等详细信息另行附页★
                </div>

                {/* ========== 4. 样品信息 ========== */}
                <div style={{ fontSize: '9px', fontWeight: 'bold', margin: '4px 0 2px' }}>●样品信息 Sample Information</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <thead>
                        <tr>
                            {['No.', '样品名称\nSample Name', '零件号\nPart No.', '材质\nMaterial', '颜色\nColor',
                                '重量(g)\nWeight', '供应商\nSupplier', 'OEM\n主机厂', '数量\nQty', '样品状态\nStatus', '备注\nRemark'
                            ].map((h, i) => (
                                <th key={i} style={{ ...thCell, width: i === 0 ? '3%' : i === 10 ? '12%' : undefined }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paddedSamples.map((s, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cell, textAlign: 'center' }}>{idx + 1}</td>
                                <td style={cell}>{s?.name || ''}</td>
                                <td style={cell}>{s?.partNo || ''}</td>
                                <td style={cell}>{s?.material || ''}</td>
                                <td style={cell}>{s?.color || ''}</td>
                                <td style={cell}>{s?.weight || ''}</td>
                                <td style={cell}>{s?.supplier || ''}</td>
                                <td style={cell}>{s?.oem || ''}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{s?.quantity || ''}</td>
                                <td style={cell}>{s?.sampleCondition || ''}</td>
                                <td style={cell}>{s?.remark || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ========== 5. 备注 ========== */}
                <div style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '7px', marginBottom: '2px', lineHeight: '1.3' }}>
                    备注：用材料、样本、子零件出具的报告，零件号和零件名称不得按总成出具，试验报告按实际试验对象、车型出具报告，不得在报告中添加多个零件名称或多个零件号。复测项目单独出具报告，不允许出在原报告中。
                </div>

                {/* ========== 6. 试验类型/送样方式 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '14%' }}>●试验类型</td>
                            <td style={{ ...cell, width: '86%' }} colSpan={5}>
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
                            <td colSpan={5} style={{ ...cell, fontSize: '7px' }}>样品保存时间原则上不少于3个月，如对试验样品封样周期有特殊要求的，以正式版DVP或技术协议规定为准。</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 7. 零部件级测试要求 ========== */}
                <div style={{ fontSize: '9px', fontWeight: 'bold', margin: '4px 0 2px' }}>●零部件级测试要求 Component Level Test Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <thead>
                        <tr>
                            {[
                                { label: 'Sample No.\n样品序号', w: '5%' },
                                { label: '●样品名称\nSample Name', w: '12%' },
                                { label: '●测试项目\nTest Item', w: '12%' },
                                { label: '●测试标准\nTest Standard', w: '12%' },
                                { label: '●测试方法、条件\nTest Method', w: '12%' },
                                { label: '●判定依据\nAssessment', w: '15%' },
                                { label: '●样品描述及取样位置\nSampling Location', w: '14%' },
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

                {/* ========== 8. 材料级测试要求 ========== */}
                <div style={{ fontSize: '9px', fontWeight: 'bold', margin: '4px 0 2px' }}>●材料级测试要求 Material Level Test Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
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

                {/* ========== 9. 附件说明 ========== */}
                <div style={{ fontSize: '7px', marginBottom: '2px', lineHeight: '1.3' }}>
                    注：如果委托单位置不够，可以附件形式提供，并签字盖章确认。成品样品做材料类测试请指定取样/测试位置（可附示意图），如未指定，默认由实验室任选位置取样/测试。
                </div>

                {/* ========== 10. 周期说明 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '10%', fontSize: '7px', verticalAlign: 'top' }}>●<br />周期说明</td>
                            <td style={{ ...cell, fontSize: '7px', lineHeight: '1.4' }}>
                                材料测试服务周期要求：<br />
                                常规服务：非老化项目5~7工作日，长期老化项目按老化箱排期+老化时间+3~5工作日；粒料需注塑制样按上述周期+3~4工作日；<br />
                                加急服务：非老化项目3~4工作日，50%加急费；（请联系实验室确认是否接受加急）<br />
                                双倍加急服务：非老化项目2~3工作日，100%加急费；（请联系实验室确认是否接受加急）<br />
                                特急服务：非老化项目1工作日，150%加急费（请联系实验室确认是否接受加急）
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 11. 分包声明 ========== */}
                <div style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '7px', marginBottom: '2px', lineHeight: '1.3' }}>
                    <Chk checked={data.acceptSubcontract === false} />
                    We do not accept subcontracting certain tests to other qualified subcontractor.
                    本公司不同意将某些测试项目安排在其他合格的分包实验室进行。（如未选择，视为接受。）
                </div>

                {/* ========== 12. 费用声明 ========== */}
                <div style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 4px', fontSize: '7px', marginBottom: '4px', lineHeight: '1.3' }}>
                    ●We request for the above test and agree that all testing will be carried out subject to scale of charges as set forth in their price list.
                    我们要求进行以上测试，并将依照所执行的价目表来付费。
                </div>

                {/* ========== 13. 签章区 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cell, width: '33%', height: '50px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>●客户盖章及签名<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Customer seal and signature</span></div>
                                <div style={{ marginTop: '20px', fontSize: '7px' }}>Date日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '33%', height: '50px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>●接收人签名<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Accepter signature</span></div>
                                <div style={{ marginTop: '20px', fontSize: '7px' }}>Date日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '34%', height: '50px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>●测试主管签名<br /><span style={{ fontWeight: 'normal', fontSize: '7px' }}>Supervisor signature</span></div>
                                <div style={{ marginTop: '20px', fontSize: '7px' }}>Date日期：____年____月____日</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 14. 底部注释 ========== */}
                <div style={{ fontSize: '6.5px', lineHeight: '1.4', color: '#333' }}>
                    <div>Notes:</div>
                    <div>1. Unless it is specified, the lab has the full discretion in carrying out the test, which including selection and using the latest edition of the testing method(s). 除非特别指定，实验室对测试完全有判断权，其中包括测试方法的选择，以及使用最新版本的测试方法来完成测试。</div>
                    <div>2. Test sample will be disposed after three months upon test report issued without sample returning at application. 测试样品在实验室最长保存3个月（液体样品保存十五天），之后实验室将按规定处理。</div>
                    <div>3. The lab assures the Applicant the validity of the procedure and the accuracy of the test results. 实验室保证所有项目均以合法的程序进行测试，并保证测试数据的准确性。如因本公司过错造成委托方损失的，承担不高于该项目检测费用3倍的损失。</div>
                    <div>4. Please sign and chop on the form, and sent back to us for arrangement test. 请将本申请表及附页的相关信息填写完整并回签，以便安排测试。</div>
                </div>

            </div>
        </>
    )
})

EntrustmentPrint.displayName = 'EntrustmentPrint'
export default EntrustmentPrint
