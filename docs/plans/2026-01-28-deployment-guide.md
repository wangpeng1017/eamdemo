# 业务流程优化功能部署指南

> 版本: 1.0 | 更新: 2026-01-28
> TDD开发：4个模块已完成

---

## 📋 部署清单

### 1. 数据库Schema同步（必须）

⚠️ **部署前必须执行，否则功能无法使用！**

```bash
# SSH到服务器
ssh root@8.130.182.148

# 进入项目目录
cd /root/limsnext

# 同步Prisma schema到数据库
npx prisma db push

# 验证字段已创建
mysql -u root -p -e "USE lims; DESCRIBE biz_client;"
mysql -u root -p -e "USE lims; DESCRIBE biz_entrustment;"
```

**预期结果：**
- `biz_client` 表应该有8个新字段（submittedAt, submittedBy, approvedAt, approvedBy, rejectedCount, lastRejectReason, lastRejectBy, lastRejectAt）
- `biz_entrustment` 表应该有3个新字段（quotationNo, quotationId）

### 2. 代码部署

```bash
# 本地提交代码（已完成）
git push

# 服务器拉取最新代码
ssh root@8.130.182.148 "cd /root/limsnext && git pull"

# 后台构建并重启（避免SSH超时）
ssh root@8.130.182.148 "cd /root/limsnext && nohup sh -c 'npm run build && pm2 restart limsnext' > /tmp/build.log 2>&1 &"

# 等待30秒后检查构建日志
sleep 30
ssh root@8.130.182.148 "cat /tmp/build.log | tail -20"
```

### 3. 验证部署

```bash
# 检查PM2进程状态
ssh root@8.130.182.148 "pm2 status"

# 检查日志
ssh root@8.130.182.148 "pm2 logs limsnext --lines 50"
```

---

## 🎯 功能模块说明

### 模块1：报价合同委托关系优化（P2）✅

**功能描述：** 报价单可以直接生成委托单，跳过合同环节

**API接口：**
```
POST /api/quotation/[id]/create-entrustment
```

**请求示例：**
```json
{
  "contactPerson": "张三",
  "sampleDate": "2026-01-28T10:00:00Z",
  "follower": "李四",
  "remark": "急件"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "entrustmentId": "clxxxx...",
    "entrustmentNo": "WT-20260128-001",
    "quotationNo": "BJ20260128001",
    "contractNo": "HT-20260128-001",  // 如果报价单有关联合同
    "message": "委托单创建成功，已复制 5 个检测项目"
  }
}
```

**业务规则：**
- ✅ 只有approved状态的报价单可以生成委托单
- ✅ 自动复制客户信息和联系方式
- ✅ 自动复制所有检测项目
- ✅ 如果报价单有关联合同，同时记录quotationId和contractNo
- ✅ sourceType标记为'quotation'

**错误情况：**
```json
{
  "success": false,
  "error": "报价单未审批通过，无法生成委托单"
}
```

---

### 模块2：审批驳回功能（P1）✅

**功能描述：** 驳回单据回发起人，要求修改后重新提交

**API接口：**
```
POST /api/quotation/[id]/reject
POST /api/contract/[id]/reject
POST /api/entrustment/[id]/reject
POST /api/client/[id]/reject
```

**请求示例：**
```json
{
  "rejectReason": "单价过低，请重新核算"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "rejectedCount": 1,
    "lastRejectReason": "单价过低，请重新核算",
    "lastRejectBy": "user-123",
    "lastRejectAt": "2026-01-28T10:00:00.000Z"
  },
  "message": "驳回成功"
}
```

**业务规则：**
- ✅ 只有pending状态的单据可以被驳回
- ✅ 驳回原因必填且不能只有空格
- ✅ 记录驳回次数（累加）
- ✅ 记录最后一次驳回信息（原因、人、时间）
- ✅ 支持4种单据类型：quotation, contract, entrustment, client

**错误情况：**
```json
{
  "success": false,
  "error": "驳回原因不能为空"
}
```

```json
{
  "success": false,
  "error": "已通过的单据无法驳回（请先撤销审批）"
}
```

---

### 模块3：报价单PDF生成控制（P0）✅

**功能描述：** 只有审批通过的报价单才能生成PDF

**API接口：**
```
GET /api/quotation/[id]/pdf
```

**业务规则：**
- ✅ 只有approved状态的报价单可以生成PDF
- ✅ 其他状态返回403 Forbidden和友好错误提示

**成功响应：**
```
Status: 200 OK
Content-Type: text/html; charset=utf-8
<body>...HTML内容...</body>
```

**错误响应（非approved状态）：**
```json
{
  "success": false,
  "error": "报价单正在审批中，请耐心等待审批完成后再生成PDF",
  "currentStatus": "pending"
}
```
HTTP Status: 403 Forbidden

**状态错误说明：**
| 状态 | 错误信息 |
|------|----------|
| draft | 报价单尚未提交审批，请先提交审批后再生成PDF |
| pending | 报价单正在审批中，请耐心等待审批完成后再生成PDF |
| rejected | 报价单已被驳回，请修改内容后重新提交审批 |
| archived | 报价单已归档，无法生成PDF |

---

### 模块4：业务单位审批功能（P1）✅

**功能描述：** 业务单位的简单1步审批流程

**API接口：**

#### 提交审批
```
POST /api/client/[id]/submit
```

**请求示例：**
```json
{
  "comment": "请审批"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": "pending",
    "message": "提交审批成功"
  }
}
```

#### 审批通过
```
POST /api/client/[id]/approve
```

**请求示例：**
```json
{
  "comment": "审批通过"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": "approved",
    "message": "审批通过"
  }
}
```

**业务规则：**
- ✅ 只有draft和rejected状态可以提交审批
- ✅ 只有pending状态可以审批通过
- ✅ approved状态不能重复操作
- ✅ 完整流程：draft → pending → approved
- ✅ rejected状态可重新提交

**状态流转图：**
```
draft → pending → approved
  ↑        ↓
  └──── rejected
```

---

## 🧪 功能测试用例

### 测试模块1：报价单直接生成委托单

```bash
# 1. 创建报价单（approved状态）
POST /api/quotation
{
  "clientId": "client-123",
  "status": "approved",
  ...
}

# 2. 从报价单生成委托单
POST /api/quotation/{quotationId}/create-entrustment
{
  "contactPerson": "收样人",
  "follower": "检测员"
}

# 3. 验证委托单创建成功
GET /api/entrustment/{entrustmentId}
# 应该看到：
# - quotationId: 报价单ID
# - quotationNo: 报价单号
# - sourceType: "quotation"
# - 检测项目已复制
```

### 测试模块2：审批驳回

```bash
# 1. 创建报价单（pending状态）
POST /api/quotation
{
  "clientId": "client-123",
  "status": "pending",
  ...
}

# 2. 驳回报价单
POST /api/quotation/{quotationId}/reject
{
  "rejectReason": "单价过低"
}

# 3. 验证状态已变为rejected，驳回次数为1
GET /api/quotation/{quotationId}
# 应该看到：
# - status: "rejected"
# - rejectedCount: 1
# - lastRejectReason: "单价过低"

# 4. 重新提交审批
POST /api/quotation/{quotationId}/submit

# 5. 再次驳回，验证次数累加
POST /api/quotation/{quotationId}/reject
{
  "rejectReason": "信息不完整"
}

# 6. 验证驳回次数为2
GET /api/quotation/{quotationId}
# rejectedCount: 2
```

### 测试模块3：PDF生成控制

```bash
# 1. 尝试从draft状态生成PDF（应该失败）
GET /api/quotation/{draft-quotation-id}/pdf
# 期望：403 Forbidden, "报价单尚未提交审批"

# 2. 尝试从pending状态生成PDF（应该失败）
GET /api/quotation/{pending-quotation-id}/pdf
# 期望：403 Forbidden, "报价单正在审批中"

# 3. 从approved状态生成PDF（应该成功）
GET /api/quotation/{approved-quotation-id}/pdf
# 期望：200 OK, 返回HTML内容
```

### 测试模块4：业务单位审批

```bash
# 1. 创建业务单位（draft状态）
POST /api/client
{
  "name": "测试客户",
  "status": "draft",
  ...
}

# 2. 提交审批
POST /api/client/{clientId}/submit
# 期望：status变为pending

# 3. 审批通过
POST /api/client/{clientId}/approve
# 期望：status变为approved

# 4. 验证不能重复审批
POST /api/client/{clientId}/approve
# 期望：400错误，"当前状态无法审批通过"
```

---

## 🔧 故障排查

### 问题1：数据库字段不存在

**症状：**
```
Error: Unknown column 'submittedAt' in 'field list'
```

**原因：** 未执行 `npx prisma db push`

**解决：**
```bash
npx prisma db push
```

### 问题2：API返回401未授权

**症状：**
```json
{
  "success": false,
  "error": "未授权"
}
```

**原因：** 用户未登录或token过期

**解决：** 检查请求头是否包含有效的认证信息

### 问题3：PDF生成返回403

**症状：**
```json
{
  "success": false,
  "error": "报价单正在审批中"
}
```

**原因：** 报价单状态不是approved

**解决：** 等待审批通过后再生成PDF

### 问题4：驳回失败

**症状：**
```json
{
  "success": false,
  "error": "草稿状态的单据无法驳回"
}
```

**原因：** 单据状态不是pending

**解决：** 只有pending状态的单据才能驳回

---

## 📞 技术支持

如有问题，请联系开发团队或查看：
- 设计文档：`docs/plans/2026-01-28-business-workflow-enhancement-design.md`
- 测试文件：`src/lib/__tests__/`
- API实现：`src/app/api/`

---

**部署完成后，请进行完整的功能测试，确保所有模块正常工作。**
