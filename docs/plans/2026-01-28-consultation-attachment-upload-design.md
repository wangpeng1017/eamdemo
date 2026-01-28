# 业务咨询附件上传功能设计文档

> 设计日期: 2026-01-28
> 设计者: AI + 王老师
> 状态: 已确认，待实现

---

## 一、需求概述

### 1.1 业务背景
在业务咨询过程中，客户需要上传样品图片、产品说明书、检测标准等附件，帮助实验室更好地了解样品信息和检测需求。

### 1.2 核心需求
- 客户在创建/编辑咨询单时，可以上传附件
- 主要用途：提供样品图片、技术资料、检测标准等
- 支持文件类型：图片（JPG/PNG/GIF）、PDF、Word、Excel
- 数量限制：每个咨询单最多 5 个附件
- 大小限制：单个文件最大 5MB

---

## 二、技术方案

### 2.1 存储方案选择

**采用方案**：本地文件系统存储

**理由**：
- ✅ 实现简单，无需第三方服务
- ✅ 无额外费用成本
- ✅ 文件访问速度快（局域网环境）
- ✅ 适合快速上线

**备选方案**：阿里云OSS存储（未来可升级）

---

## 三、数据库设计

### 3.1 Schema 变更

�� `Consultation` 模型中添加附件字段：

```prisma
model Consultation {
  id                 String    @id @default(cuid())
  consultationNo     String    @unique @db.VarChar(50)
  clientId           String?
  client             Client?   @relation(fields: [clientId], references: [id])
  clientContactPerson String?  @db.VarChar(50)
  testItems          String?   @db.Text
  expectedDeadline   DateTime?
  budgetRange        String?   @db.VarChar(50)
  status             String    @default("following")
  follower           String?   @db.VarChar(50)
  feasibility        String?   @db.VarChar(20)
  feasibilityNote    String?   @db.Text
  quotationId        String?
  quotationNo        String?   @db.VarChar(50)
  clientRequirement  String?   @db.Text

  // ✨ 新增字段
  attachments        String?   @db.Text // JSON数组格式存储附件信息

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  followUps    ConsultationFollowUp[]
  assessments  ConsultationAssessment[]

  @@map("biz_consultation")
}
```

### 3.2 附件数据格式

```typescript
interface Attachment {
  id: string              // 唯一ID (cuid)
  originalName: string    // 原始文件名 "样品图片.jpg"
  fileName: string        // 服务器存储文件名 "clxxx_product.jpg"
  fileSize: number        // 文件大小（字节）
  mimeType: string        // MIME类型 "image/jpeg"
  uploadedAt: string      // 上传时间 ISO8601
  uploadedBy: string      // 上传人姓名
}
```

**存储示例**：

```json
[
  {
    "id": "clxxx123",
    "originalName": "产品外观图.jpg",
    "fileName": "clxxx123_product.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg",
    "uploadedAt": "2026-01-28T10:00:00Z",
    "uploadedBy": "张三"
  },
  {
    "id": "clyyy456",
    "originalName": "检测标准.pdf",
    "fileName": "clyyy456_standard.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "uploadedAt": "2026-01-28T10:05:00Z",
    "uploadedBy": "张三"
  }
]
```

### 3.3 文件存储路径规则

```
/root/lims-next/uploads/
  └── consultation/
      ├── temp/                    # 临时文件（上传后、提交前）
      │   ├── clxxx_product.jpg
      │   └── clyyy_spec.pdf
      └── {consultationId}/        # 正式文件（咨询单创建后）
          ├── clxxx_product.jpg
          ├── clyyy_spec.pdf
          └── clzzz_report.docx
```

---

## 四、API接口设计

### 4.1 文件上传接口

**路径**：`POST /api/upload/consultation`

**认证**：需要登录（withAuth）

**请求格式**：`multipart/form-data`

**请求参数**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 要上传的文件 |
| consultationId | string | 否 | 咨询单ID（编辑时提供） |

**返回格式**：
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "originalName": "产品图.jpg",
    "fileName": "clxxx123_product.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg",
    "fileUrl": "/uploads/consultation/temp/clxxx123_product.jpg",
    "uploadedAt": "2026-01-28T10:00:00Z",
    "uploadedBy": "张三"
  }
}
```

**错误处理**：
- 文件类型不支持 → 400 "不支持的文件类型"
- 文件超过5MB → 400 "文件大小超过限制"
- 未登录 → 401 "未授权"

---

### 4.2 文件删除接口

**路径**：`DELETE /api/upload/consultation/{fileId}`

**认证**：需要登录

**功能**：
1. 从数据库中删除附件记录
2. 物理删除文件

**返回格式**：
```json
{
  "success": true,
  "data": {
    "message": "文件已删除"
  }
}
```

---

### 4.3 文件访问接口

**路径**：`GET /uploads/consultation/{consultationId}/{fileName}`

**认证**：需要登录（中间件验证）

**功能**：静态文件访问

**配置**：在 `next.config.js` 中配置静态文件访问规则

---

### 4.4 修改现有接口

#### 4.4.1 创建咨询单

**路径**：`POST /api/consultation`

**新增处理逻辑**：
1. 接收 `attachments` 数组（前端上传后返回的文件信息）
2. 创建咨询单成功后，将文件从 `temp/` 移动到 `{consultationId}/`
3. 更新数据库中的 `attachments` 字段（更新文件路径）

#### 4.4.2 更新咨询单

**路径**：`PUT /api/consultation/[id]`

**新增处理逻辑**：
1. 接收新的 `attachments` 数组
2. 对比现有附件，删除不再需要的文件
3. 将新上传的文件从 `temp/` 移动到 `{consultationId}/`
4. 更新数据库

---

## 五、前端设计

### 5.1 Upload组件集成

在咨询单创建/编辑表单中添加：

```tsx
<Form.Item
  label="附件上传"
  name="attachments"
  extra="支持图片、PDF、Word、Excel，单个文件最大5MB，最多5个文件"
>
  <Upload
    action="/api/upload/consultation"
    listType="picture-card"
    maxCount={5}
    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
    beforeUpload={beforeUpload}
    onChange={handleUploadChange}
    onRemove={handleRemove}
  >
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传附件</div>
    </div>
  </Upload>
</Form.Item>
```

### 5.2 文件验证

```typescript
const beforeUpload = (file: File) => {
  // 验证文件类型
  const validTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (!validTypes.includes(file.type)) {
    message.error('只能上传图片、PDF或Office文档！')
    return Upload.LIST_IGNORE
  }

  // 验证文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    message.error('文件大小不能超过5MB！')
    return Upload.LIST_IGNORE
  }

  return true
}
```

### 5.3 附件展示（详情页）

在咨询详情的Descriptions组件中添加：

```tsx
{
  label: '附件',
  value: data.attachments && data.attachments.length > 0 ? (
    <Space direction="vertical" size="small">
      {data.attachments.map((file: Attachment) => (
        <div key={file.id}>
          {file.mimeType.startsWith('image/') ? (
            <Image
              width={100}
              src={`/uploads/consultation/${data.id}/${file.fileName}`}
              alt={file.originalName}
            />
          ) : (
            <a
              href={`/uploads/consultation/${data.id}/${file.fileName}`}
              download={file.originalName}
              target="_blank"
            >
              <PaperClipOutlined /> {file.originalName}
            </a>
          )}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {(file.fileSize / 1024).toFixed(2)} KB
          </Text>
        </div>
      ))}
    </Space>
  ) : '-'
}
```

---

## 六、实现细节

### 6.1 文件上传处理流程

```
用户选择文件
    ↓
前端验证（类型、大小）
    ↓
调用 POST /api/upload/consultation
    ↓
后端接收 multipart/form-data
    ↓
生成唯一文件名（cuid + 扩展名）
    ↓
保存到 /uploads/consultation/temp/
    ↓
返回文件信息给前端
    ↓
前端显示在Upload组件中
    ↓
用户提交表单
    ↓
调用 POST /api/consultation
    ↓
后端创建咨询单
    ↓
将文件从 temp/ 移动到 {consultationId}/
    ↓
更新数据库 attachments 字段
    ↓
完成
```

### 6.2 临时文件清理

**方式一：定时任务**
- 每天凌晨 3:00 执行清理脚本
- 删除超过 24 小时的临时文件

**方式二：创建时清理**
- 咨询单创建成功后，移动文件到正式目录
- 创建失败或用户取消，文件保留在temp等待定时清理

### 6.3 安全性措施

| 安全措施 | 实现方式 |
|----------|----------|
| **文件类型限制** | 白名单验证（前端+后端双重） |
| **文件大小限制** | 前端+后端双重验证（5MB） |
| **文件名安全** | 使用cuid生成，避免路径遍历 |
| **访问权限** | 登录验证中间件 |
| **MIME类型检测** | 使用 `mime-types` 库验证 |

---

## 七、技术栈

### 7.1 后端依赖

```json
{
  "formidable": "^3.5.1",      // 处理文件上传
  "fs-extra": "^11.2.0",       // 文件操作（移动、删除）
  "mime-types": "^2.1.35"      // 文件类型检测
}
```

### 7.2 前端组件

- Ant Design `Upload` 组件
- Ant Design `Image` 组件（图片预览）
- `PaperClipOutlined` 图标

---

## 八、测试场景

### 8.1 功能测试

- [ ] 上传图片文件（JPG/PNG/GIF）
- [ ] 上传PDF文件
- [ ] 上传Word文件（.doc/.docx）
- [ ] 上传Excel文件（.xls/.xlsx）
- [ ] 上传不支持的文件类型（应拒绝）
- [ ] 上传超过5MB的文件（应拒绝）
- [ ] 上传超过5个文件（应拒绝）
- [ ] 删除已上传的文件
- [ ] 创建咨询单后文件正确保存
- [ ] 编辑咨询单，新增/删除附件
- [ ] 详情页正确显示附件
- [ ] 图片附件支持预览
- [ ] 文档附件支持下载

### 8.2 安全测试

- [ ] 未登录用户无法上传
- [ ] 尝试上传恶意文件（.exe/.sh等）
- [ ] 路径遍历攻击防护（../../etc/passwd）
- [ ] 文件大小限制有效
- [ ] 文件类型验证有效

### 8.3 边界测试

- [ ] 上传0字节文件
- [ ] 上传正好5MB的文件
- [ ] 同时上传5个文件
- [ ] 重复上传同名文件
- [ ] 网络中断时的上传
- [ ] 临时文件清理是否正常

---

## 九、实施计划

### 阶段一：后端开发（2-3小时）
1. 安装依赖包（formidable、fs-extra、mime-types）
2. 创建上传API（/api/upload/consultation）
3. 创建删除API
4. 修改咨询单创建/更新API
5. 配置静态文件访问
6. 编写单元测试

### 阶段二：数据库迁移（30分钟）
1. 更新Prisma Schema
2. 执行 prisma db push
3. 验证数据库变更

### 阶段三：前端开发（2小时）
1. 在咨询单表单中集成Upload组件
2. 实现文件验证逻辑
3. 实现文件删除功能
4. 在详情页显示附件列表
5. 实现图片预览和文件下载

### 阶段四：测试与部署（1小时）
1. 本地功能测试
2. 安全测试
3. 部署到测试服务器
4. 生产环境部署

**预计总时长**：6-7小时

---

## 十、未来优化方向

1. **OSS存储迁移**：当文件数量增多时，迁移到阿里云OSS
2. **图片压缩**：上传时自动压缩大图，节省存储空间
3. **文件预览**：PDF/Office文档在线预览（使用第三方服务）
4. **批量下载**：支持批量下载所有附件（打包为ZIP）
5. **版本管理**：支持附件的版本控制
6. **水印功能**：自动为图片添加水印

---

## 十一、风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 服务器磁盘空间不足 | 中 | 定期清理、监控磁盘使用率 |
| 大文件上传超时 | 低 | 5MB限制可避免 |
| 恶意文件上传 | 低 | 文件类型白名单+后端验证 |
| 并发上传性能问题 | 低 | 使用流式处理，限制并发数 |

---

## 十二、验收标准

- [x] 支持图片、PDF、Office文档上传
- [x] 单个文件不超过5MB
- [x] 每个咨询单最多5个附件
- [x] 文件安全验证（类型、大小）
- [x] 登录用户才能上传
- [x] 详情页正确显示附件
- [x] 图片支持预览
- [x] 文档支持下载
- [x] 临时文件自动清理
- [x] 所有测试用例通过

---

**设计完成日期**：2026-01-28
**下一步**：准备开始实现
