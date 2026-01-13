#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys

source_file = "src/app/(dashboard)/entrustment/consultation/page.tsx"
target_path = "/root/lims-next/src/app/(dashboard)/entrustment/consultation/page.tsx"

# 读取源文件
with open(source_file, 'rb') as f:
    content = f.read()

# 使用 sshpass 和 ssh 上传
cmd = f'''sshpass -p 'xx198910170014Z' ssh -o StrictHostKeyChecking=no root@8.130.182.148 "cat > {target_path}"'''

proc = subprocess.Popen(
    cmd,
    shell=True,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

stdout, stderr = proc.communicate(input=content)

if proc.returncode != 0:
    print(f"Error: {stderr.decode()}", file=sys.stderr)
    sys.exit(1)

print("文件上传成功")
