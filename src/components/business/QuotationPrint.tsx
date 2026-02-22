'use client'

import React from 'react'
import { DEFAULT_SAMPLE_DELIVERY, DEFAULT_PAYEE, DEFAULT_TERMS } from '@/lib/quotation-defaults'

interface QuotationPrintProps {
    data: any
}

// 固定税率
const TAX_RATE = 0.06

// 安全解析 JSON 字符串
function safeParseJson(value: any, fallback: any) {
    if (!value) return fallback
    if (typeof value === 'object') return value
    try {
        return JSON.parse(value)
    } catch {
        return fallback
    }
}

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

    // 从报价单级别配置读取，回退到默认值
    const sampleDelivery = safeParseJson(data.sampleDeliveryInfo, DEFAULT_SAMPLE_DELIVERY)
    const payee = safeParseJson(data.payeeInfo, DEFAULT_PAYEE)
    const terms = safeParseJson(data.terms, DEFAULT_TERMS)

    // 样品名称：从明细行提取去重
    const sampleNames = [...new Set(items.map((item: any) => item.sampleName).filter(Boolean))].join('、')

    return (
        <div style={{ padding: '20px 40px', fontFamily: 'SimSun, serif', fontSize: 12, color: '#000', background: '#fff' }}>
            {/* 标题 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, letterSpacing: 4 }}>报  价  单</h2>
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
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>发件人 From</td>
                        <td style={cellStyle}>{data.clientContactPerson || ''}</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>发件人 From</td>
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
                        <td style={cellStyle}>{data.serviceAddress || '扬州市邗江区金山路99号'}</td>
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

            {/* 样品名称行 */}
            {sampleNames && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cellStyle, fontWeight: 'bold', width: '15%', borderBottom: 'none' }}>样品名称</td>
                            <td style={{ ...cellStyle, borderBottom: 'none' }}>{sampleNames}</td>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* 报价明细表 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ ...cellStyle, width: '5%', fontWeight: 'bold' }}>序号</th>
                        <th style={{ ...cellStyle, width: '22%', fontWeight: 'bold' }}>检测项目<br /><span style={{ fontSize: 10 }}>Service Item</span></th>
                        <th style={{ ...cellStyle, width: '18%', fontWeight: 'bold' }}>检测标准<br /><span style={{ fontSize: 10 }}>Method Standard</span></th>
                        <th style={{ ...cellStyle, width: '8%', fontWeight: 'bold' }}>数量<br /><span style={{ fontSize: 10 }}>Quantity</span></th>
                        <th style={{ ...cellStyle, width: '9%', fontWeight: 'bold' }}>单价<br /><span style={{ fontSize: 10 }}>Price</span></th>
                        <th style={{ ...cellStyle, width: '10%', fontWeight: 'bold' }}>总价<br /><span style={{ fontSize: 10 }}>Total Cost</span></th>
                        <th style={{ ...cellStyle, width: '18%', fontWeight: 'bold' }}>备注</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, index: number) => (
                        <tr key={index}>
                            <td style={{ ...cellStyle, textAlign: 'center' }}>{index + 1}</td>
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

            {/* 费用汇总 - 与 Excel 一致的三行 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold', width: '82%' }}>以上测试费用为人民币含税报价</td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', width: '10%' }}>报价合计</td>
                        <td style={{ ...cellStyle, textAlign: 'right', width: '8%' }}>{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style={cellStyle}></td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>含税合计（含税 {(TAX_RATE * 100).toFixed(0)}%）</td>
                        <td style={{ ...cellStyle, textAlign: 'right' }}>{taxTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style={cellStyle}></td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>优惠后合计（含税 {(TAX_RATE * 100).toFixed(0)}%）</td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: 14 }}>{discountTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 送样信息 / 收款方信息 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr style={{ background: '#f0f0f0' }}>
                        <td style={{ ...cellStyle, fontWeight: 'bold', width: '50%' }}>寄样信息 Sample Delivery Information</td>
                        <td style={{ ...cellStyle, fontWeight: 'bold', width: '50%' }}>收款方信息 Payee Information</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                            <div>地 址：{sampleDelivery.address}</div>
                            <div>电 话：{sampleDelivery.tel}</div>
                            <div>收件人：{sampleDelivery.contact}</div>
                        </td>
                        <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                            <div>户 名：{payee.name}</div>
                            <div>开户行：{payee.bank}</div>
                            <div>行 号：{payee.bankNo}</div>
                            <div>账 号：{payee.account}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 签章区 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '50%', height: 100, verticalAlign: 'top', fontWeight: 'bold' }}>
                            ★委托方签字（盖章）
                            <div style={{ marginTop: 50 }}>日期：</div>
                        </td>
                        <td style={{ ...cellStyle, width: '50%', height: 100, verticalAlign: 'top', fontWeight: 'bold', position: 'relative' as const }}>
                            ★服务方签字（盖章）
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

            {/* 附加说明 */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 'bold', marginBottom: 4 }}>★Additional Information 附加说明：</p>
                <p style={{ fontSize: 11, marginBottom: 8, color: '#666' }}>
                    收到此报价单后，请按以下流程操作（Upon receiving this quotation, please proceed according to the following steps:）：
                </p>
                {(terms as any[]).map((term: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: 6, lineHeight: 1.6 }}>
                        <div style={{ fontSize: 11 }}>{term.zh}</div>
                        <div style={{ color: '#666', fontSize: 10 }}>{term.en}</div>
                    </div>
                ))}
            </div>
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
