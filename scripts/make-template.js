/**
 * 将 QCT+检测报告.docx 中的固定文本替换为 docxtemplater 占位符
 * 生成 QCT+检测报告-模板.docx
 */
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../docs/QCT+检测报告.docx');
const outputFile = path.join(__dirname, '../docs/QCT+检测报告-模板.docx');

const content = fs.readFileSync(inputFile, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 需要替换的文本对照表
// Word XML 里文本可能被拆分成多个 <w:t> 标签，所以直接在合并后的 XML 字符串中替换
const replacements = [
    // 封面字段
    ['报 告 编 号：', '报 告 编 号：{reportNo}'],
    ['样 品 名 称：', '样 品 名 称：{sampleName}'],
    ['检 测 项 目：', '检 测 项 目：{testProject}'],
    ['委 托 单 位：', '委 托 单 位：{clientName}'],
    ['委托单位地址：', '委托单位地址：{clientAddress}'],

    // 正文表格 - 样品信息区域（只替换第一次出现的空值）
    // 我们需要在 XML 层面做映射，这里用简单文本替换方式
];

// 在 XML 中做替换（处理文本可能跨 w:t 标签的问题）
// 先尝试直接文本替换
for (const [from, to] of replacements) {
    if (xml.includes(from)) {
        xml = xml.replace(from, to);
        console.log(`✅ 替换: "${from}" → "${to}"`);
    } else {
        console.log(`⚠️ 未找到: "${from}" (可能被 XML 标签分割)`);
    }
}

// 对于表格中的信息字段，在 XML 层面查找并替换
// 查找所有 w:tc (表格单元格) 并尝试标识和替换

// 正文表格字段映射 - 找到特定 label 后面的单元格内容
const tableFieldMap = [
    { label: '样品名称', tag: '{sampleName}' },
    { label: '样品编号', tag: '{sampleNo}' },
    { label: '型号规格', tag: '{specification}' },
    { label: '委托单位', tag: '{clientName}' },
    { label: '样品描述/状态', tag: '{sampleDesc}' },
    { label: '样品数量', tag: '{sampleQuantity}' },
    { label: '送样日期', tag: '{receivedDate}' },
    { label: '委托编号', tag: '{entrustmentNo}' },
    { label: '检测项目', tag: '{testProject}' },
    { label: '检测日期', tag: '{testDate}' },
    { label: '签发日期', tag: '{issuedDate}' },
];

// 找到检测依据区域，用循环模板替换
// 签发日期后面添加占位符
// 编制/审核/批准
const signatureReplacements = [
    ['编制：', '编制：{preparer}'],
    ['审核：', '审核：{reviewer}'],
    ['批准：', '批准：{approver}'],
];

for (const [from, to] of signatureReplacements) {
    if (xml.includes(from)) {
        xml = xml.replace(from, to);
        console.log(`✅ 替换: "${from}" → "${to}"`);
    }
}

// 保存修改后的 XML
zip.file('word/document.xml', xml);

// 生成输出文件
const output = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(outputFile, output);
console.log(`\n✅ 模板已生成: ${outputFile}`);
console.log(`文件大小: ${(output.length / 1024).toFixed(1)} KB`);
