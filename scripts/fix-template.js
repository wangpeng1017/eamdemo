/**
 * 修改 QCT docx 模板 v3：
 * 使用 {#samples}...{/samples} 多行循环（6行一组），
 * 每个元素用独立变量名，保留原始合并结构
 */
const fs = require('fs')
const path = require('path')
const PizZip = require('pizzip')

const templatePath = path.join(process.cwd(), 'public/uploads/templates/1771919600604-ql24il.docx')
const backupPath = templatePath + '.bak'

// 从备份恢复原始模板
if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, templatePath)
    console.log('已从备份恢复原始模板')
} else {
    fs.copyFileSync(templatePath, backupPath)
    console.log('已创建备份')
}

const content = fs.readFileSync(templatePath, 'binary')
const zip = new PizZip(content)
let docXml = zip.file('word/document.xml').asText()

// === 找到表1的6个数据行 ===
// 标记各行位置
const rows = []
const rowMarkers = ['>Pb<', '>Hg<', '>Cd<']
// Cr6+ 行需要找 >Cr< 后面跟 >6+< 或 >Cr6+<
// PBBs 和 PBDEs 行
const pbIdx = docXml.indexOf('>Pb<')
const pbdesIdx = docXml.indexOf('>PBDEs<')

// 从 Pb 到 PBDEs 之间找所有 <w:tr 行
let searchStart = docXml.lastIndexOf('<w:tr ', pbIdx)
const searchEnd = docXml.indexOf('</w:tr>', pbdesIdx) + 6

// 提取所有数据行
let pos = searchStart
let rowIdx = 0
while (pos < searchEnd) {
    const trStart = docXml.indexOf('<w:tr', pos)
    if (trStart < 0 || trStart >= searchEnd) break
    const trEnd = docXml.indexOf('</w:tr>', trStart) + 6
    rows.push({ start: trStart, end: trEnd, xml: docXml.substring(trStart, trEnd) })
    pos = trEnd
    rowIdx++
}

console.log(`找到 ${rows.length} 个数据行`)

// 获取每行的文本内容
rows.forEach((r, i) => {
    const texts = r.xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
    const values = texts.map(t => t.replace(/<[^>]+>/g, ''))
    console.log(`  行${i}: ${values.join(' | ')}`)
})

// === 定义每行要替换的变量 ===
// 行结构(原模板文本 → 变量名):
// Pb:     1, Pb, P, ——, ≤0.1%, 合格
// Hg:     Hg, P, ——, ≤0.1%, 合格
// Cd:     Cd, P, ——, ≤0.01%, 合格
// Cr6+:   Cr, 6+, P, ——, ≤0.1%, 合格
// PBBs:   PBBs, P,  ——, ≤0.1%, 合格
// PBDEs:  PBDEs, ——, ≤0.1%, 合格

const rowReplacements = [
    // Pb row (第一行): 添加 {#samples} 开始循环
    [{ from: '>1</w:t>', to: '>{#samples}{seq}</w:t>' },
    { from: '>P</w:t>', to: '>{pb_xrf}</w:t>' },
    { from: '>——</w:t>', to: '>{pb_chem}</w:t>' },
    { from: '>≤0.1%</w:t>', to: '>{pb_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{pb_conc}</w:t>' }],
    // Hg row
    [{ from: '>P</w:t>', to: '>{hg_xrf}</w:t>' },
    { from: '>——</w:t>', to: '>{hg_chem}</w:t>' },
    { from: '>≤0.1%</w:t>', to: '>{hg_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{hg_conc}</w:t>' }],
    // Cd row
    [{ from: '>P</w:t>', to: '>{cd_xrf}</w:t>' },
    { from: '>——</w:t>', to: '>{cd_chem}</w:t>' },
    // Cd 的标准可能是 ≤0.01% 而非 ≤0.1%
    { from: />\u22640\.0?1%<\/w:t>/, to: '>{cd_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{cd_conc}</w:t>' }],
    // Cr6+ row
    [{ from: '>P</w:t>', to: '>{cr_xrf}</w:t>' },
    { from: '>——</w:t>', to: '>{cr_chem}</w:t>' },
    { from: '>≤0.1%</w:t>', to: '>{cr_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{cr_conc}</w:t>' }],
    // PBBs row
    [{ from: '>P</w:t>', to: '>{pbbs_xrf}</w:t>' },
    { from: '>——</w:t>', to: '>{pbbs_chem}</w:t>' },
    { from: '>≤0.1%</w:t>', to: '>{pbbs_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{pbbs_conc}</w:t>' }],
    // PBDEs row (最后一行): 添加 {/samples} 结束循环
    [{ from: '>——</w:t>', to: '>{pbdes_chem}</w:t>' },
    { from: '>≤0.1%</w:t>', to: '>{pbdes_std}</w:t>' },
    { from: '>合格</w:t>', to: '>{pbdes_conc}{/samples}</w:t>' }],
]

// 逐行替换
for (let i = 0; i < Math.min(rows.length, rowReplacements.length); i++) {
    let rowXml = rows[i].xml
    for (const rep of rowReplacements[i]) {
        if (rep.from instanceof RegExp) {
            if (rep.from.test(rowXml)) {
                rowXml = rowXml.replace(rep.from, rep.to)
            } else {
                console.log(`  行${i} 正则未匹配: ${rep.from}`)
            }
        } else {
            const pos = rowXml.indexOf(rep.from)
            if (pos >= 0) {
                rowXml = rowXml.replace(rep.from, rep.to)
            } else {
                console.log(`  行${i} 未找到: ${rep.from}`)
            }
        }
    }
    rows[i].newXml = rowXml
}

// 重建文档: 替换所有6个数据行
const beforeTable = docXml.substring(0, rows[0].start)
const afterTable = docXml.substring(rows[rows.length - 1].end)
const newRows = rows.map(r => r.newXml || r.xml).join('')
docXml = beforeTable + newRows + afterTable

// === 2. 添加样品图片标签 ===
const photoIdx = docXml.indexOf('样品照片')
if (photoIdx >= 0) {
    const fig1Idx = docXml.indexOf('图', photoIdx + 10)
    if (fig1Idx >= 0) {
        const paraStart = docXml.lastIndexOf('<w:p ', fig1Idx)
        if (paraStart >= 0) {
            const imgPara = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%samplePhoto}</w:t></w:r></w:p>'
            docXml = docXml.substring(0, paraStart) + imgPara + docXml.substring(paraStart)
            console.log('已添加样品图片标签')
        }
    }
}

// 保存
zip.file('word/document.xml', docXml)
const output = zip.generate({ type: 'nodebuffer' })
fs.writeFileSync(templatePath, output)
console.log('模板已更新！')

// 验证
const verify = fs.readFileSync(templatePath, 'binary')
const vzip = new PizZip(verify)
const vxml = vzip.file('word/document.xml').asText()
const vtags = vxml.match(/\{[^}]+\}/g) || []
console.log('\n模板变量:', [...new Set(vtags)])

// 验证循环标签位置
if (vxml.includes('{#samples}') && vxml.includes('{/samples}')) {
    const s1 = vxml.indexOf('{#samples}')
    const s2 = vxml.indexOf('{/samples}')
    const startInTc = vxml.lastIndexOf('<w:tc', s1) > vxml.lastIndexOf('</w:tc>', s1)
    const endInTc = vxml.lastIndexOf('<w:tc', s2) > vxml.lastIndexOf('</w:tc>', s2)
    console.log('\n循环标签验证:')
    console.log('  {#samples} 在单元格内:', startInTc)
    console.log('  {/samples} 在单元格内:', endInTc)
}
