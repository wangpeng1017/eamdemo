# -*- coding: utf-8 -*-
"""
提示组件统一迁移脚本 - 简化版
只处理简单的 message.* 调用替换，复杂的 Modal.confirm 需要手动处理
"""

import os
import re
import subprocess

# 需要处理的文件列表（排除已手动修改的文件）
EXCLUDED_FILES = [
    'src/app/(dashboard)/entrustment/consultation/page.tsx',
    'src/app/(dashboard)/system/user/page.tsx',
]

def should_process_file(filepath):
    """检查文件是否需要处理"""
    for excluded in EXCLUDED_FILES:
        if excluded in filepath:
            return False
    return True

def process_file(filepath):
    """处理单个文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 如果文件已经导入了统一工具库，跳过
        if "from '@/lib/confirm'" in content:
            return False, '已导入统一工具库'

        modified = False

        # 1. 替换 message 调用
        if 'message.' in content:
            # message.success('xxx') -> showSuccess('xxx')
            content = re.sub(r'\bmessage\.success\(', 'showSuccess(', content)
            # message.error('xxx') -> showError('xxx')
            content = re.sub(r'\bmessage\.error\(', 'showError(', content)
            # message.warning('xxx') -> showWarningMessage('xxx')
            content = re.sub(r'\bmessage\.warning\(', 'showWarningMessage(', content)
            # message.info('xxx') -> showInfo('xxx')
            content = re.sub(r'\bmessage\.info\(', 'showInfo(', content)

            # 移除 antd 导入中的 message
            if "import { ..., message, ... } from 'antd'" in content or \
               "import {..., message,...} from 'antd'" in content:
                content = re.sub(
                    r",\s*message,",
                    ",",
                    content
                )
                content = re.sub(
                    r"message,\s*",
                    "",
                    content
                )

            modified = True

        # 2. 添加统一工具库导入（如果还没有）
        if modified and "from '@/lib/confirm'" not in content:
            # 找到第一个 import 语句后插入
            lines = content.split('\n')
            insert_idx = -1

            for i, line in enumerate(lines):
                if "import" in line and "from" in line:
                    insert_idx = i
                    break

            if insert_idx >= 0:
                # 确定需要导入哪些函数
                needed_imports = []
                if 'showSuccess(' in content:
                    needed_imports.append('showSuccess')
                if 'showError(' in content:
                    needed_imports.append('showError')
                if 'showWarningMessage(' in content:
                    needed_imports.append('showWarningMessage')
                if 'showInfo(' in content:
                    needed_imports.append('showInfo')

                if needed_imports:
                    imports_str = ', '.join(needed_imports)
                    import_line = "import {{ {} }} from '@/lib/confirm'".format(imports_str)
                    lines.insert(insert_idx + 1, import_line)
                    content = '\n'.join(lines)

        if content != original_content:
            # 写入 .bak 备份文件
            backup_path = filepath + '.bak'
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)

            # 写入修改后的文件
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            return True, '已修改'
        else:
            return False, '无需修改'

    except Exception as e:
        return False, '处理失败: {}'.format(str(e))

def main():
    """主函数"""
    root_dir = '/Users/wangpeng/Downloads/limsnext'

    print('🔍 开始扫描文件...')

    # 使用 find 命令查找所有 .tsx 文件
    result = subprocess.run(
        ['find', 'src/app', 'src/components', '-name', '*.tsx', '-type', 'f'],
        cwd=root_dir,
        capture_output=True,
        text=True
    )

    files = [f for f in result.stdout.strip().split('\n') if f and should_process_file(f)]

    print(f'📊 找到 {len(files)} 个文件需要检查\n')

    modified_count = 0
    skipped_count = 0
    error_count = 0

    for filepath in files:
        full_path = os.path.join(root_dir, filepath)
        modified, message_text = process_file(full_path)

        if modified:
            print(f'  ✅ {filepath}')
            modified_count += 1
        elif '失败' in message_text:
            print(f'  ❌ {filepath}: {message_text}')
            error_count += 1
        else:
            skipped_count += 1

    print(f'\n📈 处理完成:')
    print(f'  ✅ 修改: {modified_count} 个文件')
    print(f'  ⏭️  跳过: {skipped_count} 个文件')
    print(f'  ❌ 错误: {error_count} 个文件')

    print('\n⚠️  注意事项:')
    print('  1. 所有修改都已创建 .bak 备份文件')
    print('  2. Modal.confirm 调用需要手动检查和调整')
    print('  3. 请测试修改后的功能是否正常')
    print('  4. 确认无误后可以删除 .bak 文件: find . -name "*.bak" -delete')

if __name__ == '__main__':
    main()
