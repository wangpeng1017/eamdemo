#!/usr/bin/env node
/**
 * 统一全系统操作列UI - 自动化重构脚本
 * 
 * 功能:
 * 1. 扫描所有 .tsx 文件
 * 2. 识别包含操作列的文件
 * 3. 统一操作列配置: fixed: 'right', 移除固定width
 * 4. 优化按钮样式: 查看/编辑/删除仅保留图标
 * 5. 生成修改报告
 */

const fs = require('fs');
const path = require('path');

// 配置
const SRC_DIR = path.join(__dirname, 'src/app/(dashboard)');
const REPORT_FILE = path.join(__dirname, 'refactor_report.md');

// 统计
const stats = {
    scanned: 0,
    modified: 0,
    files: []
};

/**
 * 递归扫描目录
 */
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.tsx')) {
            stats.scanned++;
            processFile(fullPath);
        }
    });
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // 检查是否包含操作列
    if (!content.includes("title: '操作'") && !content.includes('title: "操作"')) {
        return;
    }

    console.log(`\n处理文件: ${path.relative(__dirname, filePath)}`);

    let modified = false;
    const changes = [];

    // 1. 统一操作列配置
    const columnResult = unifyOperationColumn(content);
    if (columnResult.modified) {
        content = columnResult.content;
        modified = true;
        changes.push(...columnResult.changes);
    }

    // 2. 优化按钮样式
    const buttonResult = optimizeButtons(content);
    if (buttonResult.modified) {
        content = buttonResult.content;
        modified = true;
        changes.push(...buttonResult.changes);
    }

    // 保存修改
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        stats.modified++;
        stats.files.push({
            path: path.relative(__dirname, filePath),
            changes
        });
        console.log(`✅ 已修改 (${changes.length} 处变更)`);
    } else {
        console.log(`⏭️  无需修改`);
    }
}

/**
 * 统一操作列配置
 */
function unifyOperationColumn(content) {
    let modified = false;
    const changes = [];

    // 匹配操作列定义 (支持多种格式)
    const operationColumnPattern = /(\{\s*title:\s*['"]操作['"],?\s*key:\s*['"]action['"],?\s*)((?:(?!\{|\}).)*)(\s*render:)/gs;

    content = content.replace(operationColumnPattern, (match, prefix, middle, suffix) => {
        let newMiddle = middle;
        let hasChanges = false;

        // 添加 fixed: 'right' (如果不存在)
        if (!middle.includes("fixed:")) {
            newMiddle = `\n      fixed: 'right',${newMiddle}`;
            changes.push("添加 fixed: 'right'");
            hasChanges = true;
        }

        // 移除固定 width (保留注释)
        const widthPattern = /\s*width:\s*\d+,?\s*/g;
        if (widthPattern.test(newMiddle)) {
            newMiddle = newMiddle.replace(widthPattern, '\n      ');
            changes.push("移除固定 width");
            hasChanges = true;
        }

        if (hasChanges) {
            modified = true;
        }

        return prefix + newMiddle + suffix;
    });

    return { content, modified, changes };
}

/**
 * 优化按钮样式
 */
function optimizeButtons(content) {
    let modified = false;
    const changes = [];

    // 1. 查看按钮: 移除文字,仅保留图标
    const viewPatterns = [
        // <Button ... onClick={...}>查看</Button>
        /(<Button[^>]*icon=\{<EyeOutlined\s*\/>\}[^>]*>)\s*查看\s*(<\/Button>)/g,
        // <Button ... >查看</Button> (添加图标)
        /(<Button[^>]*)(onClick=\{[^}]+handleView[^}]*\}[^>]*>)\s*查看\s*(<\/Button>)/g,
    ];

    viewPatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
            if (index === 0) {
                // 已有图标,移除文字
                content = content.replace(pattern, '$1$2');
                changes.push("查看按钮: 移除文字");
            } else {
                // 添加图标并移除文字
                content = content.replace(pattern, '$1icon={<EyeOutlined />} $2$3');
                changes.push("查看按钮: 添加图标并移除文字");
            }
            modified = true;
        }
    });

    // 2. 编辑按钮: 移除文字,仅保留图标
    const editPatterns = [
        /(<Button[^>]*icon=\{<EditOutlined\s*\/>\}[^>]*>)\s*编辑\s*(<\/Button>)/g,
        /(<Button[^>]*)(onClick=\{[^}]+handleEdit[^}]*\}[^>]*>)\s*编辑\s*(<\/Button>)/g,
    ];

    editPatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
            if (index === 0) {
                content = content.replace(pattern, '$1$2');
                changes.push("编辑按钮: 移除文字");
            } else {
                content = content.replace(pattern, '$1icon={<EditOutlined />} $2$3');
                changes.push("编辑按钮: 添加图标并移除文字");
            }
            modified = true;
        }
    });

    // 3. 删除按钮: 移除文字,仅保留图标
    const deletePatterns = [
        /(<Button[^>]*danger[^>]*icon=\{<DeleteOutlined\s*\/>\}[^>]*>)\s*删除\s*(<\/Button>)/g,
        /(<Button[^>]*)(danger[^>]*onClick=\{[^}]+handleDelete[^}]*\}[^>]*>)\s*删除\s*(<\/Button>)/g,
    ];

    deletePatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
            if (index === 0) {
                content = content.replace(pattern, '$1$2');
                changes.push("删除按钮: 移除文字");
            } else {
                content = content.replace(pattern, '$1icon={<DeleteOutlined />} $2$3');
                changes.push("删除按钮: 添加图标并移除文字");
            }
            modified = true;
        }
    });

    // 4. 确保 Space 有 whiteSpace: 'nowrap'
    const spacePattern = /(<Space[^>]*)(>)/g;
    content = content.replace(spacePattern, (match, prefix, suffix) => {
        if (!prefix.includes('whiteSpace')) {
            changes.push("添加 whiteSpace: 'nowrap'");
            modified = true;
            return `${prefix} style={{ whiteSpace: 'nowrap' }}${suffix}`;
        }
        return match;
    });

    return { content, modified, changes };
}

/**
 * 生成报告
 */
function generateReport() {
    let report = `# 操作列UI统一 - 修改报告\n\n`;
    report += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += `## 统计\n\n`;
    report += `- 扫描文件: ${stats.scanned} 个\n`;
    report += `- 修改文件: ${stats.modified} 个\n\n`;

    if (stats.files.length > 0) {
        report += `## 修改详情\n\n`;
        stats.files.forEach((file, index) => {
            report += `### ${index + 1}. ${file.path}\n\n`;
            file.changes.forEach(change => {
                report += `- ✅ ${change}\n`;
            });
            report += `\n`;
        });
    } else {
        report += `## 无需修改\n\n所有文件已符合标准配置。\n`;
    }

    fs.writeFileSync(REPORT_FILE, report, 'utf-8');
    console.log(`\n\n📊 报告已生成: ${REPORT_FILE}`);
}

/**
 * 主函数
 */
function main() {
    console.log('========================================');
    console.log('  统一全系统操作列UI - 自动化脚本');
    console.log('========================================\n');

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`❌ 错误: 源目录不存在: ${SRC_DIR}`);
        process.exit(1);
    }

    console.log(`📂 扫描目录: ${SRC_DIR}\n`);

    scanDirectory(SRC_DIR);

    console.log('\n========================================');
    console.log(`✅ 扫描完成!`);
    console.log(`   扫描文件: ${stats.scanned} 个`);
    console.log(`   修改文件: ${stats.modified} 个`);
    console.log('========================================\n');

    generateReport();
}

// 执行
main();
