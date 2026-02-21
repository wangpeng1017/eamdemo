#!/usr/bin/env node
/**
 * 第二批 UI 一致性修复:
 * P0-2: 前端邮箱/手机格式验证
 * P1-2: Popconfirm 文本统一
 * P1-3: 表单标签去除英文（统一纯中文）
 */
const fs = require('fs')
const path = require('path')

const BASE = '/Users/wangpeng/Downloads/limsnext/src'

function walkFiles(dir, ext) {
    const files = []
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, item.name)
        if (item.isDirectory()) files.push(...walkFiles(p, ext))
        else if (p.endsWith(ext)) files.push(p)
    }
    return files
}

const allTsx = walkFiles(BASE, '.tsx')
let totalChanges = 0

// =========================
// P0-2: 邮箱/手机格式验证
// =========================
console.log('\n=== P0-2: 添加邮箱/手机前端格式验证 ===\n')
let p02Count = 0

for (const file of allTsx) {
    let content = fs.readFileSync(file, 'utf-8')
    const original = content

    // 邮箱字段：在 name="xxx(e|E)mail" 的 Form.Item 的 Input 后，确保有格式验证
    // 找 name="...email..." 或 name="...Email..." 且没有 type: 'email' 规则的
    content = content.replace(
        /(<Form\.Item\s+name="[^"]*[eE]mail[^"]*"\s+label="[^"]*")(>)/g,
        (match, prefix, suffix) => {
            // 如果已经有 rules，不处理
            if (prefix.includes('rules=')) return match
            return `${prefix} rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}${suffix}`
        }
    )

    // 手机号字段：name="phone" 且有 rules 但没有 pattern 的
    // 只处理 name="phone" label="手机号" 的情况（用户管理页面）
    content = content.replace(
        /name="phone"\s+label="手机号"\s+rules=\{\[\{\s*required:\s*true,\s*message:\s*'请输入手机号'\s*\}\]\}/g,
        `name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\\d{9}$/, message: '请输入正确的手机号' }]}`
    )

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8')
        const rel = path.relative(path.join(BASE, '..'), file)
        console.log(`✅ ${rel}`)
        p02Count++
    }
}
console.log(`P0-2 修复 ${p02Count} 个文件`)
totalChanges += p02Count

// =========================
// P1-2: Popconfirm 文本统一
// =========================
console.log('\n=== P1-2: Popconfirm 文本统一 ===\n')
let p12Count = 0

for (const file of allTsx) {
    let content = fs.readFileSync(file, 'utf-8')
    const original = content

    // 统一 Popconfirm title 格式为 "确认删除？"
    // 模式1: title="确认删除?" → "确认删除？"
    content = content.replace(/(<Popconfirm\s+)title="确认删除\?"/g, '$1title="确认删除？"')
    // 模式2: title="确认删除此xxx?" → "确认删除？"（简化统一）
    content = content.replace(/(<Popconfirm\s+)title="确认删除此[^"]*\?"/g, '$1title="确认删除？"')
    // 模式3: title="确认删除该xxx？" → "确认删除？"
    content = content.replace(/(<Popconfirm\s+)title="确认删除该[^"]*[？?]"/g, '$1title="确认删除？"')
    // 模式4: title="确认删除" (无问号) → "确认删除？"
    content = content.replace(/(<Popconfirm\s+)title="确认删除"(?!\？)/g, '$1title="确认删除？"')
    // 模式5: title="确定删除？" → "确认删除？"
    content = content.replace(/(<Popconfirm\s+)title="确定删除[？?]"/g, '$1title="确认删除？"')

    // 处理 key="delete" title= 的情况
    content = content.replace(/(<Popconfirm\s+key="delete"\s+)title="确认删除\?"/g, '$1title="确认删除？"')

    // 统一添加 okText="确定" cancelText="取消" (如果没有的话)
    // 只处理没有 okText 的 Popconfirm
    content = content.replace(
        /(<Popconfirm\s+(?:key="[^"]*"\s+)?title="确认删除？"\s+onConfirm=\{[^}]+\})>/g,
        (match, prefix) => {
            if (match.includes('okText=')) return match
            return `${prefix} okText="确定" cancelText="取消">`
        }
    )

    // 统一处理其他 Popconfirm (title="确认xxx?" 任意内容)
    content = content.replace(
        /(<Popconfirm\s+title="[^"]*"\s+onConfirm=\{[^}]+\})>/g,
        (match, prefix) => {
            if (match.includes('okText=')) return match
            return `${prefix} okText="确定" cancelText="取消">`
        }
    )

    // 删除后将回滚的特殊提示保持不变，但加 okText
    content = content.replace(
        /(<Popconfirm\s+title="删除后将[^"]*"\s+onConfirm=\{[^}]+\})>/g,
        (match, prefix) => {
            if (match.includes('okText=')) return match
            return `${prefix} okText="确定" cancelText="取消">`
        }
    )

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8')
        const rel = path.relative(path.join(BASE, '..'), file)
        console.log(`✅ ${rel}`)
        p12Count++
    }
}
console.log(`P1-2 修复 ${p12Count} 个文件`)
totalChanges += p12Count

// =========================
// P1-3: 表单标签去除英文
// =========================
console.log('\n=== P1-3: 表单标签去除英文 ===\n')
let p13Count = 0

const labelReplacements = {
    // EntrustmentForm + 外部委托表单
    '电话 Telephone': '电话',
    '电子邮箱 Email': '电子邮箱',
    '联系人 Person in Charge': '联系人',
    '委托单位 Applicant': '委托单位',
    '地址 Address': '地址',
    '传真 Fax': '传真',
    '邮编 Post Code': '邮编',

    // ConsultationForm / QuotationForm
    '电话 Tel': '电话',
    '邮箱 Email': '邮箱',
    '委托人 From': '委托人',
    '委托方 Company': '委托方',
    '传真 Fax No': '传真',
    '地址 Add': '地址',
    '联系人 Contact': '联系人',
    '联系人 Contact Person': '联系人',

    // 其他可能的
    '样品名称 Sample Name': '样品名称',
    '检测项目 Test Item': '检测项目',
}

for (const file of allTsx) {
    let content = fs.readFileSync(file, 'utf-8')
    const original = content

    for (const [oldLabel, newLabel] of Object.entries(labelReplacements)) {
        // 替换 label="xxx"
        content = content.replace(new RegExp(`label="${oldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `label="${newLabel}"`)
        // 替换 label: "xxx"（table column 中的情况）
        content = content.replace(new RegExp(`label: "${oldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `label: "${newLabel}"`)
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8')
        const rel = path.relative(path.join(BASE, '..'), file)
        const changeCount = [...content.matchAll(/label="/g)].length
        console.log(`✅ ${rel}`)
        p13Count++
    }
}
console.log(`P1-3 修复 ${p13Count} 个文件`)
totalChanges += p13Count

console.log(`\n✅ 第二批总计修复 ${totalChanges} 个文件\n`)
