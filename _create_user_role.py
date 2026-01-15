# -*- coding: utf-8 -*-
import subprocess
import json

# 1. 创建普通用户角色
create_role_sql = """
-- 创建普通用户角色
INSERT INTO Role (id, name, code, description, dataScope, status, createdAt, updatedAt)
VALUES (
  'role_user_' || substr(hex(randomblob(16)), 1, 16),
  '普通用户',
  'user',
  '系统普通用户，具有基本操作权限',
  'self',
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(code) DO UPDATE SET
  name = '普通用户',
  description = '系统普通用户，具有基本操作权限',
  updatedAt = datetime('now');

-- 查询所有角色
SELECT id, name, code, description, dataScope, status FROM Role ORDER BY createdAt;
"""

# 保存 SQL 到临时文件
with open('/tmp/create_user_role.sql', 'w', encoding='utf-8') as f:
    f.write(create_role_sql)

print("✅ SQL 脚本已生成：/tmp/create_user_role.sql")
print("\n请执行以下命令来创建角色：")
print("  cd /Users/wangpeng/Downloads/limsnext")
print("  npx prisma db execute --file /tmp/create_user_role.sql")
