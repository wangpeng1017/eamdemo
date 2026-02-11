'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Upload,
  Tree, Card, Row, Col, Popconfirm, Tooltip, Typography, Tag,
  Drawer, Descriptions
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, ExperimentOutlined,
  UploadOutlined, FilePdfOutlined, EyeOutlined,
  SendOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'

const { Text } = Typography

// 审批流程编码
const APPROVAL_FLOW_CODE = 'FLOW_INSPECTION_ITEM'

// 分类数据类型
interface Category {
  id: string
  name: string
  code: string | null
  description?: string | null
  sort: number
  parentId: string | null
  children?: Category[]
  _count?: { items: number }
}

// 检测项目数据类型
interface InspectionItem {
  id: string
  categoryId: string | null
  name: string
  executionStandard: string | null
  sampleQuantity: string | null
  materialFile: string | null
  method: string | null
  unit: string | null
  requirement: string | null
  remark: string | null
  sort: number
  status: number
  approvalStatus: string
  approvalStep: number
  approvalInstanceId: string | null
  category?: { id: string; name: string; parentId: string | null }
}

// 审批状态显示配置
const APPROVAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '审批中', color: 'processing' },
  effective: { label: '现行有效', color: 'success' },
  pending_delete: { label: '待删除审批', color: 'warning' },
}

export default function InspectionStandardsPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const currentUserName = currentUser?.name || currentUser?.realName || '用户'
  const currentUserId = currentUser?.id || ''

  // === 分类 ===
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedIsParent, setSelectedIsParent] = useState(false)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [addingSubCategory, setAddingSubCategory] = useState(false)
  const [categoryForm] = Form.useForm()

  // === 检测项目 ===
  const [items, setItems] = useState<InspectionItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InspectionItem | null>(null)
  const [itemForm] = Form.useForm()
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  // === PDF 预览 ===
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [submitting, setSubmitting] = useState(false)

  // === 查看 Drawer ===
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [viewingItem, setViewingItem] = useState<InspectionItem | null>(null)

  // ==================== 分类管理 ====================

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inspection-standard-category')
      const json = await res.json()
      if (json.success && json.data) {
        const list: Category[] = Array.isArray(json.data) ? json.data : []
        setCategories(list)

        const tree: DataNode[] = list.map(parent => ({
          key: parent.id,
          title: (
            <span>
              {parent.name}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                ({(parent.children || []).reduce((sum, c) => sum + (c._count?.items || 0), 0) + (parent._count?.items || 0)})
              </Text>
            </span>
          ),
          icon: <FolderOutlined />,
          children: (parent.children || []).map(child => ({
            key: child.id,
            title: (
              <span>
                {child.name}
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                  ({child._count?.items || 0})
                </Text>
              </span>
            ),
            icon: <ExperimentOutlined />,
            isLeaf: true,
          })),
        }))
        setTreeData(tree)
        setExpandedKeys(list.map(c => c.id))

        // 自动选中第一个二级分类（如"纺织品"）
        if (!selectedKey && list.length > 0) {
          const firstParent = list[0]
          const firstChild = (firstParent.children || [])[0]
          if (firstChild) {
            setSelectedKey(firstChild.id)
            setSelectedIsParent(false)
            setSelectedCategoryName(`${firstParent.name} > ${firstChild.name}`)
            fetchItems(firstChild.id, false)
          } else {
            setSelectedKey(firstParent.id)
            setSelectedIsParent(true)
            setSelectedCategoryName(firstParent.name)
            fetchItems(firstParent.id, true)
          }
        }
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  const handleAddParentCategory = () => {
    setEditingCategory(null)
    setAddingSubCategory(false)
    categoryForm.resetFields()
    setCategoryModalOpen(true)
  }

  const handleAddSubCategory = () => {
    if (!selectedKey) return
    setEditingCategory(null)
    setAddingSubCategory(true)
    categoryForm.resetFields()
    const parentId = selectedIsParent ? selectedKey : categories
      .flatMap(c => c.children || [])
      .find(c => c.id === selectedKey)?.parentId || selectedKey
    categoryForm.setFieldValue('parentId', parentId)
    setCategoryModalOpen(true)
  }

  const handleEditCategory = () => {
    if (!selectedKey) return
    let cat: Category | null = null
    for (const parent of categories) {
      if (parent.id === selectedKey) { cat = parent; break }
      const child = (parent.children || []).find(c => c.id === selectedKey)
      if (child) { cat = child; break }
    }
    if (!cat) return
    setEditingCategory(cat)
    setAddingSubCategory(false)
    categoryForm.setFieldsValue({ name: cat.name, code: cat.code, description: cat.description, sort: cat.sort })
    setCategoryModalOpen(true)
  }

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields()
      setSubmitting(true)
      const url = editingCategory
        ? `/api/inspection-standard-category/${editingCategory.id}`
        : '/api/inspection-standard-category'
      const method = editingCategory ? 'PUT' : 'POST'
      const payload = { ...values }
      if (addingSubCategory && values.parentId) {
        payload.parentId = values.parentId
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingCategory ? '更新分类成功' : '创建分类成功')
        setCategoryModalOpen(false)
        fetchCategories()
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedKey) return
    try {
      const res = await fetch(`/api/inspection-standard-category/${selectedKey}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        setSelectedKey(null)
        setItems([])
        fetchCategories()
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  // ==================== 检测项目管理 ====================

  const fetchItems = async (key: string, isParent: boolean) => {
    setLoadingItems(true)
    try {
      const param = isParent ? `parentCategoryId=${key}` : `categoryId=${key}`
      const res = await fetch(`/api/inspection-item?${param}`)
      const json = await res.json()
      if (json.success && json.data) {
        setItems(Array.isArray(json.data) ? json.data : [])
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('加载检测项目失败:', err)
      showError('加载检测项目失败')
    }
    setLoadingItems(false)
  }

  const handleAddItem = () => {
    if (!selectedKey) return
    setEditingItem(null)
    setUploadedFileUrl(null)
    setUploadedFileName('')
    itemForm.resetFields()
    if (!selectedIsParent) {
      itemForm.setFieldValue('categoryId', selectedKey)
    }
    setItemModalOpen(true)
  }

  const handleEditItem = (record: InspectionItem) => {
    // 审批中或待删除审批中不允许编辑
    if (record.approvalStatus === 'pending' || record.approvalStatus === 'pending_delete') {
      showError('该项目正在审批中，无法编辑')
      return
    }
    setEditingItem(record)
    setUploadedFileUrl(record.materialFile || null)
    setUploadedFileName(record.materialFile ? record.materialFile.split('/').pop() || '' : '')
    itemForm.setFieldsValue({
      name: record.name,
      executionStandard: record.executionStandard,
      sampleQuantity: record.sampleQuantity,
      remark: record.remark,
    })
    setItemModalOpen(true)
  }

  const handleDeleteItem = async (item: InspectionItem) => {
    // 如果是现行有效的，需要走审批流删除
    if (item.approvalStatus === 'effective') {
      try {
        setSubmitting(true)
        // 先将状态改为 pending_delete
        await fetch(`/api/inspection-item/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalStatus: 'pending_delete' }),
        })
        // 提交删除审批
        const res = await fetch('/api/approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bizType: 'inspection_item',
            bizId: item.id,
            flowCode: APPROVAL_FLOW_CODE,
            submitterId: currentUserId,
            submitterName: currentUserName,
          }),
        })
        const json = await res.json()
        if (res.ok && json.success) {
          showSuccess('已提交删除审批')
          if (selectedKey) fetchItems(selectedKey, selectedIsParent)
          fetchCategories()
        } else {
          // 回滚状态
          await fetch(`/api/inspection-item/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvalStatus: 'effective' }),
          })
          showError(json.error?.message || json.error || '提交审批失败')
        }
      } catch {
        showError('提交审批失败')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // 草稿状态直接删除
    try {
      const res = await fetch(`/api/inspection-item/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        if (selectedKey) fetchItems(selectedKey, selectedIsParent)
        fetchCategories()
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  // 提交审批（针对草稿状态的项目）
  const handleSubmitApproval = async (item: InspectionItem) => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizType: 'inspection_item',
          bizId: item.id,
          flowCode: APPROVAL_FLOW_CODE,
          submitterId: currentUserId,
          submitterName: currentUserName,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('已提交审批')
        if (selectedKey) fetchItems(selectedKey, selectedIsParent)
      } else {
        showError(json.error?.message || json.error || '提交审批失败')
      }
    } catch {
      showError('提交审批失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 上传检验材料 PDF
  const handleUploadMaterial = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/inspection-material', { method: 'POST', body: formData })
      const json = await res.json()
      if (res.ok && json.success) {
        setUploadedFileUrl(json.data.fileUrl)
        setUploadedFileName(json.data.originalName)
        showSuccess('上传成功')
      } else {
        showError(json.error || '上传失败')
      }
    } catch {
      showError('上传失败')
    }
    setUploading(false)
    return false
  }

  const handleItemSubmit = async () => {
    try {
      const values = await itemForm.validateFields()
      setSubmitting(true)

      let categoryId = values.categoryId
      if (!categoryId && !selectedIsParent) {
        categoryId = selectedKey
      }

      // 编辑现行有效的项目→保存后变为草稿
      let approvalStatus: string | undefined
      if (editingItem && editingItem.approvalStatus === 'effective') {
        approvalStatus = 'draft'
      }

      const payload = {
        ...values,
        categoryId,
        materialFile: uploadedFileUrl || null,
        ...(approvalStatus ? { approvalStatus } : {}),
      }
      const url = editingItem ? `/api/inspection-item/${editingItem.id}` : '/api/inspection-item'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        if (editingItem && editingItem.approvalStatus === 'effective') {
          showSuccess('已保存修改，状态变为草稿，请重新提交审批')
        } else {
          showSuccess(editingItem ? '更新成功' : '创建成功')
        }
        setItemModalOpen(false)
        if (selectedKey) fetchItems(selectedKey, selectedIsParent)
        fetchCategories()
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== PDF 预览（带水印） ====================

  const openPdfPreview = (fileUrl: string, title: string) => {
    setPdfPreviewUrl(fileUrl)
    setPdfPreviewTitle(title)
    setPdfPreviewOpen(true)
  }

  const addWatermarkToIframe = () => {
    setTimeout(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = '16px Arial'
      ctx.fillStyle = 'rgba(180, 180, 180, 0.3)'
      ctx.translate(150, 100)
      ctx.rotate(-30 * Math.PI / 180)
      ctx.textAlign = 'center'
      ctx.fillText(currentUserName, 0, -10)
      ctx.font = '12px Arial'
      ctx.fillText(new Date().toLocaleDateString('zh-CN'), 0, 12)

      const watermarkUrl = canvas.toDataURL()
      const overlay = document.getElementById('pdf-watermark-overlay')
      if (overlay) {
        overlay.style.backgroundImage = `url(${watermarkUrl})`
        overlay.style.backgroundRepeat = 'repeat'
      }
    }, 500)
  }

  // ==================== 生命周期 ====================

  useEffect(() => { fetchCategories() }, [])

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return
    const key = selectedKeys[0] as string
    const isParent = categories.some(c => c.id === key)
    setSelectedKey(key)
    setSelectedIsParent(isParent)

    let catName = ''
    if (isParent) {
      catName = categories.find(c => c.id === key)?.name || ''
    } else {
      for (const p of categories) {
        const child = (p.children || []).find(c => c.id === key)
        if (child) { catName = `${p.name} > ${child.name}`; break }
      }
    }
    setSelectedCategoryName(catName)
    fetchItems(key, isParent)
  }

  const getSubCategories = () => {
    if (!selectedKey) return []
    if (selectedIsParent) {
      const parent = categories.find(c => c.id === selectedKey)
      return parent?.children || []
    }
    return []
  }

  // ==================== 表格列 ====================

  const columns: ColumnsType<InspectionItem> = [
    {
      title: '序号', width: 60, align: 'center',
      render: (_: unknown, __: unknown, i: number) => i + 1,
    },
    {
      title: '检测项目', dataIndex: 'name', width: 200,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: '执行标准', dataIndex: 'executionStandard', width: 200,
      render: (v) => v || '-',
    },
    {
      title: '样本容量', dataIndex: 'sampleQuantity', width: 80, align: 'center',
      render: (v) => v || '-',
    },
    {
      title: '检验材料', dataIndex: 'materialFile', width: 100, align: 'center',
      render: (fileUrl: string | null, record: InspectionItem) => {
        if (!fileUrl) return <Text type="secondary">-</Text>
        return (
          <Tooltip title="点击查看 PDF">
            <Button
              type="link"
              size="small"
              icon={<FilePdfOutlined style={{ color: '#e74c3c' }} />}
              onClick={() => openPdfPreview(fileUrl, record.name)}
            >
              <span style={{ color: '#e74c3c' }}>查看</span>
            </Button>
          </Tooltip>
        )
      },
    },
    {
      title: '状态', dataIndex: 'approvalStatus', width: 110, align: 'center',
      render: (status: string) => {
        const config = APPROVAL_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '备注', dataIndex: 'remark', ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作', width: 180, fixed: 'right', align: 'center',
      render: (_, record) => {
        const isDraft = record.approvalStatus === 'draft'
        const isPending = record.approvalStatus === 'pending'
        const isPendingDelete = record.approvalStatus === 'pending_delete'
        const isEffective = record.approvalStatus === 'effective'

        return (
          <Space size="small">
            {/* 草稿→提交审批 */}
            {isDraft && (
              <Tooltip title="提交审批">
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={() => handleSubmitApproval(record)}
                />
              </Tooltip>
            )}
            {/* 查看 */}
            <Tooltip title="查看">
              <Button size="small" icon={<EyeOutlined />} onClick={() => { setViewingItem(record); setViewDrawerOpen(true) }} />
            </Tooltip>
            {/* 只有草稿和现行有效可编辑（现行有效编辑后变为草稿） */}
            {(isDraft || isEffective) && (
              <Tooltip title={isEffective ? '编辑（将变为草稿）' : '编辑'}>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record)} />
              </Tooltip>
            )}
            {/* 草稿直接删除，现行有效需审批删除 */}
            {isDraft && (
              <Popconfirm
                title="确认删除?"
                description="删除后同时移除关联的检测模板"
                onConfirm={() => handleDeleteItem(record)}
                okText="确认" cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
            {isEffective && (
              <Popconfirm
                title="删除现行有效项目需审批"
                description="将提交删除审批，审批通过后自动删除"
                onConfirm={() => handleDeleteItem(record)}
                okText="提交审批" cancelText="取消"
              >
                <Tooltip title="申请删除">
                  <Button size="small" danger icon={<DeleteOutlined />} loading={submitting} />
                </Tooltip>
              </Popconfirm>
            )}
            {/* 审批中显示状态 */}
            {(isPending || isPendingDelete) && (
              <Tooltip title={isPendingDelete ? '删除审批中' : '审批中'}>
                <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} spin />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  // ==================== 渲染 ====================

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>检测标准</h2>
      </div>
      <Row gutter={16}>
        {/* 左侧：二级分类树 */}
        <Col span={5}>
          <Card
            title="检测分类"
            size="small"
            extra={
              <Tooltip title="新增一级分类">
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddParentCategory} />
              </Tooltip>
            }
            styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflow: 'auto' } }}
          >
            {treeData.length > 0 ? (
              <>
                <Tree
                  showIcon
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  selectedKeys={selectedKey ? [selectedKey] : []}
                  onSelect={handleTreeSelect}
                  treeData={treeData}
                />
                {selectedKey && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                    <Space size="small" wrap>
                      {selectedIsParent && (
                        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={handleAddSubCategory}>
                          子分类
                        </Button>
                      )}
                      <Button size="small" icon={<EditOutlined />} onClick={handleEditCategory}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除分类?"
                        description={selectedIsParent ? '需先删除子分类' : '需先删除检测项目'}
                        onConfirm={handleDeleteCategory}
                        okText="确认" cancelText="取消"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                暂无分类，请先新增
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：检测项目列表 */}
        <Col span={19}>
          <Card
            title={selectedCategoryName ? `${selectedCategoryName} - 检测项目` : '检测项目'}
            size="small"
            extra={
              selectedKey ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
                  新增检测项目
                </Button>
              ) : null
            }
          >
            {selectedKey ? (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={items}
                loading={loadingItems}
                size="small"
                pagination={false}
                scroll={{ y: 'calc(100vh - 280px)' }}
                locale={{ emptyText: '暂无检测项目' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
                ← 请先选择左侧分类
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ========== 分类编辑 Modal ========== */}
      <Modal
        title={editingCategory ? '编辑分类' : (addingSubCategory ? '新增子分类' : '新增一级分类')}
        open={categoryModalOpen}
        onOk={handleCategorySubmit}
        onCancel={() => setCategoryModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical">
          {addingSubCategory && <Form.Item name="parentId" hidden><Input /></Form.Item>}
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder={addingSubCategory ? '如：纺织品、塑料、橡胶' : '如：非金属材料、金属材料'} />
          </Form.Item>
          <Form.Item name="code" label="分类编码">
            <Input placeholder="分类编码（可选）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="分类说明（可选）" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 检测项目编辑 Modal ========== */}
      <Modal
        title={editingItem ? '编辑检测项目' : '新增检测项目'}
        open={itemModalOpen}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalOpen(false)}
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        {editingItem?.approvalStatus === 'effective' && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 6, fontSize: 13 }}>
            ⚠️ 编辑现行有效的项目后，状态将变为<Tag color="default">草稿</Tag>，需重新提交审批
          </div>
        )}
        <Form form={itemForm} layout="vertical">
          {selectedIsParent && !editingItem && (
            <Form.Item name="categoryId" label="所属子分类" rules={[{ required: true, message: '请选择子分类' }]}>
              <select style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #d9d9d9', height: 32 }}>
                <option value="">请选择</option>
                {getSubCategories().map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </Form.Item>
          )}
          <Form.Item name="name" label="检测项目" rules={[{ required: true, message: '请输入检测项目名称' }]}>
            <Input placeholder="如：拉伸强度、弯曲强度" />
          </Form.Item>
          <Form.Item name="executionStandard" label="执行标准">
            <Input placeholder="如：GB/T 1040.2-2022" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleQuantity" label="样本容量">
                <Input placeholder="如：5、≥20g" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="排序" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          {/* 检验材料 PDF 上传 */}
          <Form.Item label="检验材料（PDF）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                accept=".pdf"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadMaterial(file)
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {uploading ? '上传中...' : '选择 PDF 文件'}
                </Button>
              </Upload>
              {uploadedFileUrl && (
                <Space>
                  <FilePdfOutlined style={{ color: '#e74c3c', fontSize: 16 }} />
                  <Text ellipsis style={{ maxWidth: 300 }}>{uploadedFileName}</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openPdfPreview(uploadedFileUrl, uploadedFileName)}
                  >
                    预览
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => { setUploadedFileUrl(null); setUploadedFileName('') }}
                  >
                    移除
                  </Button>
                </Space>
              )}
            </Space>
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="如：试样为哑铃型、5A型或1A型；尺寸参考标准" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== PDF 预览 Modal（带水印） ========== */}
      <Modal
        title={`检验材料 - ${pdfPreviewTitle}`}
        open={pdfPreviewOpen}
        onCancel={() => setPdfPreviewOpen(false)}
        width="90vw"
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
        afterOpenChange={(open) => {
          if (open) addWatermarkToIframe()
        }}
      >
        <div
          id="pdf-watermark-container"
          style={{ position: 'relative', width: '100%', height: 'calc(90vh - 100px)' }}
        >
          <iframe
            ref={iframeRef}
            src={pdfPreviewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF 预览"
          />
          <div
            id="pdf-watermark-overlay"
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        </div>
      </Modal>

      {/* ========== 查看 Drawer ========== */}
      <Drawer
        title={`检测项目详情 - ${viewingItem?.name || ''}`}
        open={viewDrawerOpen}
        onClose={() => { setViewDrawerOpen(false); setViewingItem(null) }}
        width={640}
        destroyOnClose
      >
        {viewingItem && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="检测项目">
                <Text strong>{viewingItem.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="执行标准">
                {viewingItem.executionStandard || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="样本容量">
                {viewingItem.sampleQuantity || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={APPROVAL_STATUS_MAP[viewingItem.approvalStatus]?.color || 'default'}>
                  {APPROVAL_STATUS_MAP[viewingItem.approvalStatus]?.label || viewingItem.approvalStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="检验材料">
                {viewingItem.materialFile ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<FilePdfOutlined style={{ color: '#e74c3c' }} />}
                    onClick={() => openPdfPreview(viewingItem.materialFile!, viewingItem.name)}
                  >
                    查看 PDF
                  </Button>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {viewingItem.remark || '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  )
}
