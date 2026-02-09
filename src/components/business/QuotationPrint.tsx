'use client'

import React from 'react'

interface QuotationPrintProps {
    data: any
}

// 固定税率
const TAX_RATE = 0.06

// 固定的送样信息
const SAMPLE_DELIVERY_INFO = {
    address: '江苏省扬州市邗江区金山路99号3楼',
    tel: '17605280797',
    contact: '王峰',
}

// 固定的收款方信息
const PAYEE_INFO = {
    name: '江苏国轻检测技术有限公司',
    bank: '中国工商银行扬州邗开发区支行',
    bankNo: '1023012002133',
    account: '1108023050100289674',
}

// 固定的 6 条条款
const TERMS = [
    {
        zh: '1. 本报价依据客户提供的资料而估算，有效期1个月，具体费用将以实际收到样品的规格及工程师评估为准。',
        en: 'This quotation is based on the information provided by the customer and is valid for one month. The actual cost will be based on the specifications of the actual samples received and the engineer\'s assessment.',
    },
    {
        zh: '2. 请按要求填写测试申请表，确认后提供样品和资料。',
        en: 'Please fill in the test application form as required, and provide samples and information after confirmation.',
    },
    {
        zh: '3. 付款条件：客户方在检测报告之日起30天内付款（逾期每天0.1%滞纳金）。',
        en: 'Payment terms: The customer shall make payment within 30 days from the date of the test report (a late payment penalty of 0.1% per day will be charged for overdue payments).',
    },
    {
        zh: '4. 本报价所提供的服务应遵循中国法律及公司服务条款。',
        en: 'The services provided in this quotation shall comply with Chinese laws and the company\'s service terms.',
    },
    {
        zh: '5. 双方同意电子邮件/传真/扫描件与原件具有同等法律效力。',
        en: 'Both parties agree that emails/faxes/scanned copies shall have the same legal effect as originals.',
    },
    {
        zh: '6. 如双方发生纠纷，应向客户方或检测方所在地法院提起诉讼。',
        en: 'In case of disputes, both parties shall file a lawsuit with the court where the customer or the testing party is located.',
    },
]

export default function QuotationPrint({ data }: QuotationPrintProps) {
    if (!data) return null

    const items = data.items || []
    const subtotal = items.reduce((sum: number, item: any) => {
        const qty = parseFloat(String(item.quantity)) || 1
        return sum + qty * (Number(item.unitPrice) || 0)
    }, 0)
    const taxTotal = subtotal * (1 + TAX_RATE)
    const discountAmount = Number(data.discountAmount) || (taxTotal - Number(data.discountTotal || taxTotal))
    const discountTotal = taxTotal - discountAmount

    return (
        <div style={{ padding: '20px 40px', fontFamily: 'SimSun, serif', fontSize: 12, color: '#000', background: '#fff' }}>
            {/* 标题 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, letterSpacing: 4 }}>★报 价 单</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>Quotation</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#999' }}>报价单号：{data.quotationNo}</p>
            </div>

            {/* 双栏头部 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>委托方 Company</td>
                        <td style={{ ...cellStyle, width: '35%' }}>{data.client?.name || data.clientName || ''}</td>
                        <td style={{ ...cellStyle, width: '15%', fontWeight: 'bold' }}>服务方 Company</td>
                        <td style={{ ...cellStyle, width: '35%' }}>江苏国轻检测技术有限公司</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>委托人 From</td>
                        <td style={cellStyle}>{data.clientContactPerson || ''}</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>安排人 From</td>
                        <td style={cellStyle}>{data.serviceContact || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>电话 Tel</td>
                        <td style={cellStyle}>{data.clientPhone || ''}</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>电话 Tel</td>
                        <td style={cellStyle}>{data.serviceTel || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>邮箱 Email</td>
                        <td style={cellStyle}>{data.clientEmail || ''}</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>邮箱 Email</td>
                        <td style={cellStyle}>{data.serviceEmail || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>地址 Adress</td>
                        <td style={cellStyle}>{data.clientAddress || ''}</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>地址 Adress</td>
                        <td style={cellStyle}>扬州市邗江区金山路99号</td>
                    </tr>
                </tbody>
            </table>

            {/* 客户要求备注 */}
            {data.clientRemark && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold', width: '15%' }}>客户要求备注</td>
                            <td style={cellStyle}>{data.clientRemark}</td>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* 报价明细表 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ ...cellStyle, width: '5%', fontWeight: 'bold' }}>序号</th>
                        <th style={{ ...cellStyle, width: '18%', fontWeight: 'bold' }}>样品名称</th>
                        <th style={{ ...cellStyle, width: '18%', fontWeight: 'bold' }}>检测项目<br /><span style={{ fontSize: 10 }}>Service Item</span></th>
                        <th style={{ ...cellStyle, width: '14%', fontWeight: 'bold' }}>检测标准<br /><span style={{ fontSize: 10 }}>Method Standard</span></th>
                        <th style={{ ...cellStyle, width: '8%', fontWeight: 'bold' }}>数量<br /><span style={{ fontSize: 10 }}>Quantity</span></th>
                        <th style={{ ...cellStyle, width: '9%', fontWeight: 'bold' }}>单价<br /><span style={{ fontSize: 10 }}>Price</span></th>
                        <th style={{ ...cellStyle, width: '10%', fontWeight: 'bold' }}>总价<br /><span style={{ fontSize: 10 }}>Total</span></th>
                        <th style={{ ...cellStyle, width: '18%', fontWeight: 'bold' }}>备注</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, index: number) => (
                        <tr key={index}>
                            <td style={{ ...cellStyle, textAlign: 'center' }}>{index + 1}</td>
                            <td style={cellStyle}>{item.sampleName || ''}</td>
                            <td style={cellStyle}>{item.serviceItem || ''}</td>
                            <td style={cellStyle}>{item.methodStandard || ''}</td>
                            <td style={{ ...cellStyle, textAlign: 'center' }}>{item.quantity || '1'}</td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.unitPrice || 0).toFixed(2)}</td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.totalPrice || 0).toFixed(2)}</td>
                            <td style={cellStyle}>{item.remark || ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 费用汇总 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', width: '82%' }}>报价合计</td>
                        <td style={{ ...cellStyle, textAlign: 'right', width: '18%' }}>{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>含税合计（含税{(TAX_RATE * 100).toFixed(0)}%）</td>
                        <td style={{ ...cellStyle, textAlign: 'right' }}>{taxTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>优惠后合计（含税{(TAX_RATE * 100).toFixed(0)}%）</td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: 14 }}>{discountTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 送样信息 / 收款方信息 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr style={{ background: '#f0f0f0' }}>
                        <td style={{ ...cellStyle, fontWeight: 'bold', width: '50%' }}>送样信息 Sample Delivery Information</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold', width: '50%' }}>收款方信息 Payee Information</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                            <div>地 址：{SAMPLE_DELIVERY_INFO.address}</div>
                            <div>电 话：{SAMPLE_DELIVERY_INFO.tel}</div>
                            <div>收件人：{SAMPLE_DELIVERY_INFO.contact}</div>
                        </td>
                        <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                            <div>户 名：{PAYEE_INFO.name}</div>
                            <div>开户行：{PAYEE_INFO.bank}</div>
                            <div>行 号：{PAYEE_INFO.bankNo}</div>
                            <div>账 号：{PAYEE_INFO.account}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 附加说明 */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 'bold', marginBottom: 4 }}>★Additional Information 附加说明</p>
                {TERMS.map((term, idx) => (
                    <div key={idx} style={{ marginBottom: 4, lineHeight: 1.5 }}>
                        <div>{term.zh}</div>
                        <div style={{ color: '#666', fontSize: 10 }}>{term.en}</div>
                    </div>
                ))}
            </div>

            {/* 签章区 */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '50%', height: 100, verticalAlign: 'top', fontWeight: 'bold' }}>
                            委托方签字（盖章）
                            <div style={{ marginTop: 50 }}>日期：</div>
                        </td>
                        <td style={{ ...cellStyle, width: '50%', height: 100, verticalAlign: 'top', fontWeight: 'bold', position: 'relative' as const }}>
                            服务方签字（盖章）
                            {/* 印章图片 - 透明叠加 */}
                            <img
                                src="/images/quotation-stamp.png"
                                alt="报价专用章"
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    bottom: 0,
                                    width: 120,
                                    height: 'auto',
                                    opacity: 0.9,
                                    pointerEvents: 'none',
                                }}
                            />
                            <div style={{ marginTop: 50 }}>
                                <span>江苏国轻检测技术有限公司</span>
                            </div>
                            <div style={{ marginTop: 4 }}>日期：</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

// 单元格样式
const cellStyle: React.CSSProperties = {
    border: '1px solid #333',
    padding: '4px 6px',
    fontSize: 11,
    lineHeight: 1.4,
}
