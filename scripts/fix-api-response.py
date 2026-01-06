# -*- coding: utf-8 -*-
import os
import re

# 需要修复的文件列表
files_to_fix = [
    'src/app/(dashboard)/entrustment/contract/page.tsx',
    'src/app/(dashboard)/entrustment/consultation/page.tsx',
    'src/app/(dashboard)/device/maintenance/page.tsx',
    'src/app/(dashboard)/device/calibration-plan/page.tsx',
    'src/app/(dashboard)/device/page.tsx',
    'src/app/(dashboard)/finance/receivable/page.tsx',
    'src/app/(dashboard)/device/maintenance-plan/page.tsx',
    'src/app/(dashboard)/entrustment/quotation/page.tsx',
    'src/app/(dashboard)/finance/invoice/page.tsx',
    'src/app/(dashboard)/outsource/supplier/page.tsx',
    'src/app/(dashboard)/system/user/page.tsx',
    'src/app/(dashboard)/report/template/page.tsx',
    'src/app/(dashboard)/sample/requisition/page.tsx',
    'src/app/(dashboard)/test/task/page.tsx',
    'src/app/(dashboard)/entrustment/client/page.tsx',
    'src/app/(dashboard)/outsource/order/page.tsx',
    'src/app/(dashboard)/system/role/page.tsx',
    'src/app/(dashboard)/system/dept/page.tsx',
    'src/app/(dashboard)/task/my/page.tsx',
    'src/app/(dashboard)/sample/list/page.tsx',
    'src/app/(dashboard)/report/generate/page.tsx',
    'src/app/(dashboard)/sample/my/page.tsx',
    'src/app/(dashboard)/task/all/page.tsx',
    'src/app/(dashboard)/sample/details/page.tsx',
    'src/app/(dashboard)/test/report/page.tsx',
]

base_path = r'E:/trae/0lims-next'

# 旧模式和新模式
old_patterns = [
    # 模式1: setData(json.list) 和 setTotal(json.total)
    (r'setData\(json\.list\)\s*\n\s*setTotal\(json\.total\)',
     '''if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }'''),
    # 模式2: setData(json.list || []) 和 setTotal(json.total || 0)
    (r'setData\(json\.list \|\| \[\]\)\s*\n\s*setTotal\(json\.total \|\| 0\)',
     '''if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }'''),
]

fixed_count = 0
for file_path in files_to_fix:
    full_path = os.path.join(base_path, file_path)
    if not os.path.exists(full_path):
        print(f'文件不存在: {file_path}')
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for old_pattern, new_code in old_patterns:
        content = re.sub(old_pattern, new_code, content)

    if content != original_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'已修复: {file_path}')
        fixed_count += 1
    else:
        print(f'无需修复或已修复: {file_path}')

print(f'\n共修复 {fixed_count} 个文件')
