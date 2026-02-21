#!/usr/bin/env node
/**
 * 批量修复表单验证 rules 缺少中文 message 的问题
 * 将 rules={[{ required: true }]} 替换为 rules={[{ required: true, message: '请填写此项' }]}
 * 同时尝试根据表单 label 生成更友好的 message
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 查找所有需要修复的文件
const result = execSync(
    `grep -rlE "required: true \\}\\]" --include="*.tsx" src/`,
    { cwd: '/Users/wangpeng/Downloads/limsnext', encoding: 'utf-8' }
).trim().split('\n').filter(Boolean)

console.log(`\n找到 ${result.length} 个文件需要修复\n`)

let totalFixed = 0

for (const relFile of result) {
    const file = path.join('/Users/wangpeng/Downloads/limsnext', relFile)
    let content = fs.readFileSync(file, 'utf-8')
    const original = content

    // 模式1: name="xxx" label="yyy" rules={[{ required: true }]}
    // 尝试从 label 提取中文名
    content = content.replace(
        /label="([^"]+)"\s*rules=\{\[\{\s*required:\s*true\s*\}\]\}/g,
        (match, label) => {
            // 提取中文部分（去掉英文）
            const cn = label.replace(/\s*[A-Za-z\s/()]+$/, '').trim() || label
            const verb = cn.includes('日期') || cn.includes('时间') ? '选择' :
                cn.includes('类型') || cn.includes('方式') || cn.includes('状态') ? '选择' : '输入'
            return `label="${label}" rules={[{ required: true, message: '请${verb}${cn}' }]}`
        }
    )

    // 模式2: label="yyy" ... \n ... rules={[{ required: true }]}（跨行情况）
    // 这种太复杂，用简单兜底：直接替换剩余的 rules={[{ required: true }]}
    content = content.replace(
        /rules=\{\[\{\s*required:\s*true\s*\}\]\}/g,
        `rules={[{ required: true, message: '此项为必填' }]}`
    )

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8')
        const count = (original.match(/required: true \}]/g) || []).length
        console.log(`✅ ${relFile} (${count} 处)`)
        totalFixed += count
    }
}

console.log(`\n✅ 共修复 ${totalFixed} 处\n`)

// P1-1: 统一 okText="确认" → "确定"
console.log('--- 统一 okText ---')
const okTextResult = execSync(
    `grep -rlE 'okText="确认"' --include="*.tsx" src/`,
    { cwd: '/Users/wangpeng/Downloads/limsnext', encoding: 'utf-8' }
).trim().split('\n').filter(Boolean)

let okTextFixed = 0
for (const relFile of okTextResult) {
    const file = path.join('/Users/wangpeng/Downloads/limsnext', relFile)
    let content = fs.readFileSync(file, 'utf-8')
    const original = content
    content = content.replace(/okText="确认"/g, 'okText="确定"')
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8')
        const count = (original.match(/okText="确认"/g) || []).length
        console.log(`✅ ${relFile} (${count} 处)`)
        okTextFixed += count
    }
}
console.log(`\n✅ okText 统一修复 ${okTextFixed} 处\n`)
