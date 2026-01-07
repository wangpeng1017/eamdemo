# -*- coding: utf-8 -*-
import os
import re

base_path = r'E:/trae/0lims-next/src/app/(dashboard)'

# 需要添加创建时间列的文件
files_to_update = [
    'sample/receipt/page.tsx',
    'sample/list/page.tsx',
    'sample/my/page.tsx',
    'sample/requisition/page.tsx',
    'sample/details/page.tsx',
    'device/page.tsx',
    'device/maintenance/page.tsx',
    'device/maintenance-plan/page.tsx',
    'device/calibration-plan/page.tsx',
    'device/repair/page.tsx',
    'entrustment/list/page.tsx',
    'entrustment/contract/page.tsx',
    'entrustment/quotation/page.tsx',
    'outsource/supplier/page.tsx',
    'outsource/order/page.tsx',
    'outsource/my/page.tsx',
    'finance/receivable/page.tsx',
    'finance/invoice/page.tsx',
    'finance/payment/page.tsx',
    'test/task/page.tsx',
    'test/report/page.tsx',
    'task/my/page.tsx',
    'task/all/page.tsx',
    'report/template/page.tsx',
    'report/client/page.tsx',
    'system/user/page.tsx',
    'system/role/page.tsx',
    'system/dept/page.tsx',
    'consumable/info/page.tsx',
    'consumable/transaction/page.tsx',
    'supplier/category/page.tsx',
    'supplier/evaluation/page.tsx',
    'supplier/template/page.tsx',
    'system/approval-flow/page.tsx',
    'system/permission/page.tsx',
]

# 创建时间列的代码
created_at_column = '''    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
    },'''

updated_count = 0

for file_path in files_to_update:
    full_path = os.path.join(base_path, file_path)
    if not os.path.exists(full_path):
        print(f'文件不存在: {file_path}')
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否已经有创建时间列
    if "title: '创建时间'" in content or 'title: "创建时间"' in content:
        print(f'已有创建时间列: {file_path}')
        continue

    # 查找 columns 数组的最后一个元素（操作列之前）
    # 模式1: 找到操作列，在其前面插入
    pattern1 = r"(\s*\{\s*title:\s*['\"]操作['\"])"
    match1 = re.search(pattern1, content)

    if match1:
        # 在操作列前插入创建时间列
        insert_pos = match1.start()
        new_content = content[:insert_pos] + created_at_column + '\n' + content[insert_pos:]

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'已添加创建时间列(操作列前): {file_path}')
        updated_count += 1
        continue

    # 模式2: 找到 columns 数组的结尾 ]
    # 在最后一个 } 和 ] 之间插入
    pattern2 = r"(const columns[^=]*=\s*\[[^\]]+)(\s*\])"
    match2 = re.search(pattern2, content, re.DOTALL)

    if match2:
        # 在 ] 前插入
        new_content = content[:match2.end(1)] + ',\n' + created_at_column + match2.group(2) + content[match2.end():]

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'已添加创建时间列(数组末尾): {file_path}')
        updated_count += 1
        continue

    print(f'未找到合适位置: {file_path}')

print(f'\n共更新 {updated_count} 个文件')
