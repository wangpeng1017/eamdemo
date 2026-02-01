# -*- coding: utf-8 -*-
content = '''// @file: 业务咨询登记页面
// @input: /api/consultation, /api/client
// @output: 咨询CRUD、生成报价
// @pos: 委托流程入口页 - 客户首次咨询
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, Drawer, Row, Col, InputNumber, Divider, Tabs, Upload, Image } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, CloseCircleOutlined, TeamOutlined, SyncOutlined, PaperClipOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
// ConsultationAssessmentModal 已废弃 - v2系统中评估人在创建咨询单时通过样品检测项分配
import ReassessmentModal from '@/components/ReassessmentModal'
import AssessmentResultTab from '@/components/AssessmentResultTab'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { showConfirm, showWarning, showSuccess, showError, showWarningMessage, showLoading } from '@/lib/confirm'
'''

with open(r'/Users/wangpeng/Downloads/limsnext/src/app/(dashboard)/entrustment/consultation/page.tsx.new', 'w', encoding='utf-8') as f:
    f.write(content)
print('Header written')

# Now let's use sed to replace the message and modal calls
import subprocess

# Read the original file
with open(r'/Users/wangpeng/Downloads/limsnext/src/app/(dashboard)/entrustment/consultation/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Skip first 20 lines (header), process the rest
new_content = []
skip_first = 20
new_content.extend(lines[:skip_first])

for i, line in enumerate(lines[skip_first:], start=skip_first):
    new_line = line

    # Replace message.error
    if 'message.error(' in line and "import" not in line:
        new_line = new_line.replace('message.error(', 'showError(')

    # Replace message.success
    if 'message.success(' in line and "import" not in line:
        new_line = new_line.replace('message.success(', 'showSuccess(')

    # Replace message.warning
    if 'message.warning(' in line and "import" not in line:
        new_line = new_line.replace('message.warning(', 'showWarningMessage(')

    # Replace Modal.confirm
    if 'Modal.confirm({' in line:
        new_line = new_line.replace('Modal.confirm({', 'showConfirm(')

    # Replace modal.warning (note: lowercase modal)
    if 'modal.warning({' in line:
        new_line = new_line.replace('modal.warning({', 'showWarning(')

    # Replace Modal.warning
    if 'Modal.warning({' in line:
        new_line = new_line.replace('Modal.warning({', 'showWarning(')

    # Special handling for confirm calls that need parameter adjustment
    if 'showConfirm(' in new_line:
        # Need to look ahead to restructure the call
        # For now, we'll leave it as is and handle in a second pass
        pass

    new_content.append(new_line)

# Write the modified content
with open(r'/Users/wangpeng/Downloads/limsnext/src/app/(dashboard)/entrustment/consultation/page.tsx.new', 'a', encoding='utf-8') as f:
    f.writelines(new_content[skip_first:])

print('File modified successfully')
'''

# Now let's manually fix the specific calls that need restructuring
# This is a list of specific replacements needed:
