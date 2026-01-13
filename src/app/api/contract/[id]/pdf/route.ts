import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'

// 生成合同 PDF（实际返回可打印的 HTML）
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const contract = await prisma.contract.findUnique({
        where: { id },
        include: {
            items: true,
            client: true,
            quotation: true,
        },
    })

    if (!contract) {
        return NextResponse.json({ error: '合同不存在' }, { status: 404 })
    }

    // 格式化日期
    const signDate = contract.signDate ? dayjs(contract.signDate).format('YYYY-MM-DD') : '-'
    const startDate = contract.effectiveDate ? dayjs(contract.effectiveDate).format('YYYY-MM-DD') : '-'
    const endDate = contract.expiryDate ? dayjs(contract.expiryDate).format('YYYY-MM-DD') : '-'

    // 格式化金额
    const amount = contract.contractAmount ? Number(contract.contractAmount).toFixed(2) : '0.00'
    const prepaymentAmount = contract.advancePaymentAmount ? Number(contract.advancePaymentAmount).toFixed(2) : '0.00'

    // 生成可打印的 HTML
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>委托合同 - ${contract.contractNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif; 
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
    h2 { font-size: 16px; margin: 20px 0 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
    .info-section { margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { font-size: 13px; line-height: 1.6; }
    .info-item label { color: #666; width: 80px; display: inline-block; }
    .info-item span { color: #000; font-weight: 500; }
    
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 6px; text-align: center; }
    th { background: #f5f5f5; font-weight: bold; }
    
    .terms-section { margin-top: 20px; font-size: 13px; }
    .term-item { margin-bottom: 10px; }
    .term-title { font-weight: bold; margin-bottom: 4px; }
    .term-content { white-space: pre-wrap; line-height: 1.5; color: #333; }

    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; page-break-inside: avoid; }
    .signature-box { width: 45%; }
    .signature-line { margin-top: 40px; border-top: 1px solid #333; padding-top: 10px; }
    
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-btn:hover { background: #40a9ff; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">打印 / 导出PDF</button>
  
  <h1>检测服务委托合同</h1>
  
  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><label>合同编号：</label><span>${contract.contractNo}</span></div>
      <div class="info-item"><label>签订日期：</label><span>${signDate}</span></div>
      <div class="info-item"><label>合同期限：</label><span>${startDate} 至 ${endDate}</span></div>
      <div class="info-item"><label>合同状态：</label><span>${contract.status}</span></div>
    </div>
  </div>

  <h2>一、委托方（甲方）信息</h2>
  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><label>单位名称：</label><span>${contract.partyACompany || contract.client?.name || '-'}</span></div>
      <div class="info-item"><label>联系人：</label><span>${contract.partyAContact || '-'}</span></div>
      <div class="info-item"><label>联系电话：</label><span>${contract.partyATel || contract.client?.phone || '-'}</span></div>
      <div class="info-item"><label>地址：</label><span>${contract.partyAAddress || contract.client?.address || '-'}</span></div>
    </div>
  </div>

  <h2>二、受托方（乙方）信息</h2>
  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><label>单位名称：</label><span>江苏国轻检测技术有限公司</span></div>
      <div class="info-item"><label>联系人：</label><span>检测中心</span></div>
      <div class="info-item"><label>联系电话：</label><span>400-123-4567</span></div>
      <div class="info-item"><label>地址：</label><span>江苏省苏州市工业园区...</span></div>
    </div>
  </div>

  <h2>三、样品信息</h2>
  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><label>样品名称：</label><span>${contract.sampleName || '-'}</span></div>
      <div class="info-item"><label>规格型号：</label><span>${contract.sampleModel || '-'}</span></div>
      <div class="info-item"><label>样品材质：</label><span>${contract.sampleMaterial || '-'}</span></div>
      <div class="info-item"><label>样品数量：</label><span>${contract.sampleQuantity || '-'}</span></div>
    </div>
  </div>

  <h2>四、服务项目及费用</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">序号</th>
        <th>检测项目</th>
        <th>方法/标准</th>
        <th style="width: 60px;">数量</th>
        <th style="width: 100px;">单价(元)</th>
        <th style="width: 100px;">金额(元)</th>
      </tr>
    </thead>
    <tbody>
      ${contract.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.serviceItem}</td>
          <td>${item.methodStandard || '-'}</td>
          <td>${item.quantity}</td>
          <td>${Number(item.unitPrice).toFixed(2)}</td>
          <td>${Number(item.totalPrice).toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr>
        <td colspan="5" style="text-align: right; font-weight: bold; padding-right: 10px;">合同总金额：</td>
        <td style="font-weight: bold;">¥${amount}</td>
      </tr>
      ${contract.hasAdvancePayment ? `
      <tr>
        <td colspan="5" style="text-align: right; padding-right: 10px;">预付款（${contract.advancePaymentAmount ? Math.round(Number(contract.advancePaymentAmount) / Number(contract.contractAmount) * 100) : 0}%）：</td>
        <td>¥${prepaymentAmount}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <h2>五、合同条款</h2>
  <div class="terms-section">
    ${[
            { title: '1. 付款方式', content: contract.termsPaymentTerms },
            { title: '2. 交付方式', content: contract.termsDeliveryTerms },
            { title: '3. 质量标准', content: contract.termsQualityTerms },
            { title: '4. 保密条款', content: contract.termsConfidentialityTerms },
            { title: '5. 违约责任', content: contract.termsLiabilityTerms },
            { title: '6. 争议解决', content: contract.termsDisputeResolution },
            contract.termsOtherTerms ? { title: '7. 其他条款', content: contract.termsOtherTerms } : null
        ].filter(Boolean).map(term => term?.content ? `
      <div class="term-item">
        <div class="term-title">${term.title}</div>
        <div class="term-content">${term.content}</div>
      </div>
    ` : '').join('')}
  </div>

  <div class="footer">
    <div class="signature-box">
      <p><strong>甲方（盖章）：</strong></p>
      <div class="signature-line">
        <p>授权代表签字：</p>
        <p style="margin-top: 10px;">日期：</p>
      </div>
    </div>
    <div class="signature-box">
      <p><strong>乙方（盖章）：</strong></p>
      <div class="signature-line">
        <p>授权代表签字：</p>
        <p style="margin-top: 10px;">日期：</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    })
}
