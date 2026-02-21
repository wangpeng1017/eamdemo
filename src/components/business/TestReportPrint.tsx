'use client'

/**
 * @file 检测报告打印组件
 * @desc 参考 EntrustmentPrint 模式，使用 @media print CSS 只打印报告内容
 */

import React, { forwardRef } from 'react'
import dayjs from 'dayjs'

export interface ReportPrintData {
    reportNo: string
    clientName?: string
    sampleName?: string
    sampleNo?: string
    specification?: string
    sampleQuantity?: string
    receivedDate?: string
    tester?: string
    reviewer?: string
    overallConclusion?: string
    createdAt?: string
    issuedDate?: string
    testResults: TestResultItem[]
    // 任务信息
    taskNo?: string
}

export interface TestResultItem {
    parameter: string
    standard?: string
    value?: string
    result?: string
    remark?: string
}

// 打印样式：隐藏页面其他内容，只显示打印区域
const printStyles = `
@media print {
  body * { visibility: hidden; }
  #report-print-wrapper {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    z-index: 99999 !important;
    overflow: visible !important;
  }
  #report-print, #report-print * { visibility: visible; }
  #report-print {
    position: relative !important;
    left: 0;
    top: 0;
    width: 100%;
  }
  @page { size: A4 portrait; margin: 15mm; }
}
`

// 基础单元格样式
const cell: React.CSSProperties = {
    border: '1px solid #000',
    padding: '4px 8px',
    fontSize: '12px',
    lineHeight: '1.5',
    verticalAlign: 'middle',
}

const thCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
}

const labelCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'right',
    width: '120px',
    backgroundColor: '#fafafa',
}

const valCell: React.CSSProperties = {
    ...cell,
}

// 结论映射
const conclusionMap: Record<string, string> = {
    qualified: '合格',
    unqualified: '不合格',
}

const TestReportPrint = forwardRef<HTMLDivElement, { data: ReportPrintData }>(({ data }, ref) => {
    const testResults = data.testResults || []

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            <div id="report-print" ref={ref} style={{
                fontFamily: 'SimSun, "宋体", serif',
                padding: '20px',
                maxWidth: '800px',
                margin: '0 auto',
                color: '#000',
            }}>

                {/* ========== 报告标题 ========== */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '4px' }}>
                        检 测 报 告
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', letterSpacing: '2px' }}>
                        Test Report
                    </div>
                </div>

                {/* ========== 报告编号行 ========== */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                    <span>报告编号：<strong>{data.reportNo}</strong></span>
                    {data.taskNo && <span>任务编号：<strong>{data.taskNo}</strong></span>}
                </div>

                {/* ========== 基本信息 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                        <tr>
                            <td style={labelCell}>客户名称</td>
                            <td style={valCell}>{data.clientName || '-'}</td>
                            <td style={labelCell}>样品名称</td>
                            <td style={valCell}>{data.sampleName || '-'}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>样品编号</td>
                            <td style={valCell}>{data.sampleNo || '-'}</td>
                            <td style={labelCell}>样品规格</td>
                            <td style={valCell}>{data.specification || '-'}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>样品数量</td>
                            <td style={valCell}>{data.sampleQuantity || '-'}</td>
                            <td style={labelCell}>收样日期</td>
                            <td style={valCell}>{data.receivedDate ? dayjs(data.receivedDate).format('YYYY-MM-DD') : '-'}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>检测人员</td>
                            <td style={valCell}>{data.tester || '-'}</td>
                            <td style={labelCell}>审核人员</td>
                            <td style={valCell}>{data.reviewer || '-'}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>报告日期</td>
                            <td style={valCell}>{data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD') : '-'}</td>
                            <td style={labelCell}>发布日期</td>
                            <td style={valCell}>{data.issuedDate ? dayjs(data.issuedDate).format('YYYY-MM-DD') : '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 检测数据 ========== */}
                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '16px 0 8px' }}>检测数据</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thCell, width: '50px' }}>序号</th>
                            <th style={thCell}>检测项目</th>
                            <th style={thCell}>技术要求</th>
                            <th style={thCell}>实测值</th>
                            <th style={{ ...thCell, width: '90px' }}>单项判定</th>
                            <th style={thCell}>备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        {testResults.length > 0 ? testResults.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ ...cell, textAlign: 'center' }}>{idx + 1}</td>
                                <td style={cell}>{item.parameter || '-'}</td>
                                <td style={cell}>{item.standard || '-'}</td>
                                <td style={cell}>{item.value || '-'}</td>
                                <td style={{
                                    ...cell, textAlign: 'center', fontWeight: 'bold',
                                    color: item.result?.includes('合格') || item.result?.includes('符合') ? '#52c41a' : '#f5222d'
                                }}>
                                    {item.result || '-'}
                                </td>
                                <td style={cell}>{item.remark || ''}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} style={{ ...cell, textAlign: 'center', color: '#999', padding: '20px' }}>
                                    暂无检测数据
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* ========== 检测结论 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...labelCell, width: '120px', fontSize: '14px' }}>检测结论</td>
                            <td style={{
                                ...valCell,
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: data.overallConclusion === 'qualified' ? '#52c41a' : '#f5222d',
                            }}>
                                {conclusionMap[data.overallConclusion || ''] || data.overallConclusion || '-'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 签章区 ========== */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...cell, width: '33%', height: '80px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>检测人员</div>
                                <div style={{ marginTop: '40px', fontSize: '11px' }}>日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '33%', height: '80px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>审核人员</div>
                                <div style={{ marginTop: '40px', fontSize: '11px' }}>日期：____年____月____日</div>
                            </td>
                            <td style={{ ...cell, width: '34%', height: '80px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>批准人员</div>
                                <div style={{ marginTop: '40px', fontSize: '11px' }}>日期：____年____月____日</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ========== 底部声明 ========== */}
                <div style={{ fontSize: '10px', lineHeight: '1.6', color: '#666', marginTop: '16px' }}>
                    <div>1. 本报告仅对所检测的样品负责，未经实验室书面许可，不得部分复制报告。</div>
                    <div>2. 检测结果仅反映所送样品的检测情况。</div>
                    <div>3. 如对检测结果有异议，应在收到报告之日起15个工作日内提出。</div>
                </div>

            </div>
        </>
    )
})

TestReportPrint.displayName = 'TestReportPrint'
export default TestReportPrint
