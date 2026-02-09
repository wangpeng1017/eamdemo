import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { validateQuotationForPDF } from '@/lib/quotation-pdf-validation'
import fs from 'fs'
import path from 'path'

// 读取印章图片并转为 base64
function getStampBase64(): string {
  try {
    const stampPath = path.join(process.cwd(), 'public', 'images', 'quotation-stamp.png')
    const data = fs.readFileSync(stampPath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return ''
  }
}

// 生成报价单 PDF（实际返回可打印的 HTML）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ✅ 验证审批状态
  const validation = await validateQuotationForPDF(id)
  if (!validation.canGenerate) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
        currentStatus: validation.currentStatus
      },
      { status: 403 }
    )
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: true,
      client: true,
    },
  })

  if (!quotation) {
    return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
  }

  // 计算金额
  const subtotal = quotation.subtotal ? Number(quotation.subtotal) : 0
  const taxTotal = quotation.taxTotal ? Number(quotation.taxTotal) : subtotal * 1.06
  const finalAmount = quotation.discountTotal ? Number(quotation.discountTotal) : taxTotal

  // 读取印章 base64
  const stampBase64 = getStampBase64()

  // 生成可打印的 HTML
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>报价单 - ${quotation.quotationNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif; 
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
    .info-section { margin-bottom: 20px; }
    .info-section h3 { font-size: 14px; color: #666; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { font-size: 13px; }
    .info-item label { color: #666; }
    .info-item span { color: #000; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: center; }
    th { background: #f5f5f5; font-weight: bold; }
    .amount-section { text-align: right; margin-top: 20px; font-size: 14px; }
    .amount-section div { margin: 5px 0; }
    .amount-section .total { font-size: 16px; font-weight: bold; color: #c00; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
    .footer > div { text-align: center; }
    .signature { margin-top: 30px; border-top: 1px solid #333; padding-top: 5px; width: 150px; }
    .stamp-area {
      position: relative;
      display: inline-block;
    }
    .stamp-img {
      position: absolute;
      right: -30px;
      top: -60px;
      width: 140px;
      height: auto;
      opacity: 0.85;
      pointer-events: none;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
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
    }
    .print-btn:hover { background: #40a9ff; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">打印 / 导出PDF</button>
  
  <h1>检测服务报价单</h1>
  
  <div class="info-section">
    <h3>报价信息</h3>
    <div class="info-grid">
      <div class="info-item"><label>报价单号：</label><span>${quotation.quotationNo}</span></div>
      <div class="info-item"><label>报价日期：</label><span>${new Date(quotation.createdAt).toLocaleDateString()}</span></div>
      <div class="info-item"><label>有效期：</label><span>30天</span></div>
      <div class="info-item"><label>状态：</label><span>${quotation.status}</span></div>
    </div>
  </div>

  <div class="info-section">
    <h3>委托方信息</h3>
    <div class="info-grid">
      <div class="info-item"><label>公司名称：</label><span>${quotation.client?.name || '-'}</span></div>
      <div class="info-item"><label>联系人：</label><span>${quotation.clientContactPerson || '-'}</span></div>
      <div class="info-item"><label>联系电话：</label><span>${quotation.client?.phone || '-'}</span></div>
      <div class="info-item"><label>电子邮箱：</label><span>${quotation.client?.email || '-'}</span></div>
      <div class="info-item" style="grid-column: 1 / -1;"><label>地址：</label><span>${quotation.client?.address || '-'}</span></div>
    </div>
  </div>

  <div class="info-section">
    <h3>检测服务项目</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">序号</th>
          <th>检测项目</th>
          <th>检测依据/方法</th>
          <th style="width: 60px;">数量</th>
          <th style="width: 100px;">单价(元)</th>
          <th style="width: 100px;">金额(元)</th>
        </tr>
      </thead>
      <tbody>
        ${quotation.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.serviceItem}</td>
            <td>${item.methodStandard}</td>
            <td>${item.quantity}</td>
            <td>${Number(item.unitPrice).toFixed(2)}</td>
            <td>${Number(item.totalPrice).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="amount-section">
    <div>小计：¥${subtotal.toFixed(2)}</div>
    <div>税额(6%)：¥${(taxTotal - subtotal).toFixed(2)}</div>
    <div>含税合计：¥${taxTotal.toFixed(2)}</div>
    <div class="total">报价金额：¥${finalAmount.toFixed(2)}</div>
  </div>

  ${quotation.clientRemark ? `
  <div class="info-section" style="margin-top: 30px;">
    <h3>备注</h3>
    <p style="font-size: 13px; line-height: 1.6;">${quotation.clientRemark}</p>
  </div>
  ` : ''}

  <div class="footer">
    <div>
      <p>报价方：江苏国轻检测技术有限公司</p>
      <p>报价人：${quotation.serviceContact || '-'}</p>
      <div class="stamp-area">
        <div class="signature">签章</div>
        ${stampBase64 ? `<img class="stamp-img" src="${stampBase64}" alt="报价专用章" />` : ''}
      </div>
    </div>
    <div>
      <p>委托方：${quotation.client?.name || '-'}</p>
      <p>确认人：</p>
      <div class="signature">签章</div>
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
