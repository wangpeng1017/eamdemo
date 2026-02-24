/**
 * 修改 QCT docx 模板：添加 docxtemplater 循环标签和图片标签
 */
const fs = require('fs')
const path = require('path')
const PizZip = require('pizzip')

const templatePath = path.join(process.cwd(), 'public/uploads/templates/1771919600604-ql24il.docx')

// 读取模板
const content = fs.readFileSync(templatePath, 'binary')
const zip = new PizZip(content)
let docXml = zip.file('word/document.xml').asText()

// === 1. 替换表1的硬编码数据行为循环模板 ===

// 找 Pb 行（第一个数据行）
const pbIdx = docXml.indexOf('>Pb<')
let firstDataRowStart = docXml.lastIndexOf('<w:tr ', pbIdx)
if (firstDataRowStart < 0) firstDataRowStart = docXml.lastIndexOf('<w:tr>', pbIdx)

// 找 PBDEs 行（最后一个数据行）
const pbdesIdx = docXml.indexOf('>PBDEs<')
const lastDataRowEnd = docXml.indexOf('</w:tr>', pbdesIdx) + 6

// 提取 Pb 行的完整 XML 作为模板
const pbRowEnd = docXml.indexOf('</w:tr>', pbIdx) + 6
let templateRow = docXml.substring(firstDataRowStart, pbRowEnd)

// 替换 Pb 行中的硬编码值为 docxtemplater 变量
const replacements = [
    { from: '1', to: '{seq}' },
    { from: 'Pb', to: '{testItem}' },
    { from: 'P', to: '{xrfResult}' },
    { from: '——', to: '{chemResult}' },
    { from: '≤0.1%', to: '{standardReq}' },
    { from: '合格', to: '{conclusion}' },
]

let textIdx = 0
for (const rep of replacements) {
    const searchStr = '>' + rep.from + '</w:t>'
    const pos = templateRow.indexOf(searchStr, textIdx)
    if (pos >= 0) {
        templateRow = templateRow.substring(0, pos + 1) + rep.to + templateRow.substring(pos + 1 + rep.from.length)
        textIdx = pos + rep.to.length
    } else {
        console.log('WARNING: 未找到:', rep.from)
    }
}

// 构建循环块
const loopBlock = '{#results}' + templateRow + '{/results}'

// 替换原来所有数据行
docXml = docXml.substring(0, firstDataRowStart) + loopBlock + docXml.substring(lastDataRowEnd)
console.log('已替换表1数据行为循环模板')

// === 2. 添加样品图片标签 ===
const photoIdx = docXml.indexOf('样品照片')
if (photoIdx >= 0) {
    const fig1Idx = docXml.indexOf('图', photoIdx)
    if (fig1Idx >= 0) {
        const paraStart = docXml.lastIndexOf('<w:p ', fig1Idx)
        if (paraStart >= 0) {
            const imgPara = '<w:p><w:r><w:t>{%samplePhoto}</w:t></w:r></w:p>'
            docXml = docXml.substring(0, paraStart) + imgPara + docXml.substring(paraStart)
            console.log('已添加样品图片标签')
        }
    }
} else {
    console.log('未找到 样品照片 位置')
}

// 保存
zip.file('word/document.xml', docXml)
const output = zip.generate({ type: 'nodebuffer' })
// 备份原模板
fs.copyFileSync(templatePath, templatePath + '.bak')
fs.writeFileSync(templatePath, output)
console.log('模板已更新！')

// 验证
const verify = fs.readFileSync(templatePath, 'binary')
const vzip = new PizZip(verify)
const vxml = vzip.file('word/document.xml').asText()
const vtags = vxml.match(/\{[^}]+\}/g) || []
console.log('更新后变量:', [...new Set(vtags)])
