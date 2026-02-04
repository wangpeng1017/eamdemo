/**
 * @file page.tsx
 * @desc 设备分类管理页面
 */
'use client'

import { useState } from 'react'
import {
  Card,
  Tree,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Descriptions,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { mockCategoryTree } from '@/data/basic-data-mock'
import { CategoryNode, categoryTypeMap, EquipmentCategoryType } from '@/lib/basic-data-types'

const { Option } = Select
const { TextArea } = Input

export default function EquipmentClassificationPage() {
  const [treeData, setTreeData] = useState<CategoryNode[]>(mockCategoryTree)
  const [selectedNode, setSelectedNode] = useState<CategoryNode | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<CategoryNode | null>(null)
  const [parentNode, setParentNode] = useState<CategoryNode | null>(null)
  const [form] = Form.useForm()

  // 统计数据
  const stats = {
    totalCategories: countNodes(treeData),
    totalEquipment: treeData.reduce((sum, node) => sum + node.equipmentCount, 0),
    processCategories: countByType(treeData, 'process'),
    functionCategories: countByType(treeData, 'function'),
    specCategories: countByType(treeData, 'specification'),
  }

  function countNodes(nodes: CategoryNode[]): number {
    let count = 0
    nodes.forEach(node => {
      count += 1
      if (node.children) {
        count += countNodes(node.children)
      }
    })
    return count
  }

  function countByType(nodes: CategoryNode[], type: EquipmentCategoryType): number {
    let count = 0
    nodes.forEach(node => {
      if (node.type === type) count += 1
      if (node.children) {
        count += countByType(node.children, type)
      }
    })
    return count
  }

  // 打开新增弹框
  const openAddModal = (parent: CategoryNode | null = null) => {
    setEditingNode(null)
    setParentNode(parent)
    form.resetFields()
    form.setFieldsValue({
      type: parent?.type || 'process',
      level: parent ? parent.level + 1 : 0,
    })
    setModalOpen(true)
  }

  // 打开编辑弹框
  const openEditModal = (node: CategoryNode) => {
    setEditingNode(node)
    form.setFieldsValue({
      title: node.title,
      type: node.type,
      code: node.code,
      description: node.description,
    })
    setModalOpen(true)
  }

  // 查看详情
  const viewDetail = (node: CategoryNode) => {
    setSelectedNode(node)
    setDetailModalOpen(true)
  }

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingNode) {
        // 编辑模式
        message.success(`分类 "${values.title}" 更新成功`)
        updateNode(treeData, editingNode.id, {
          ...editingNode,
          title: values.title,
          type: values.type,
          code: values.code,
          description: values.description,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 新增模式
        const newNode: CategoryNode = {
          id: `CAT${Date.now()}`,
          key: `node-${Date.now()}`,
          title: values.title,
          type: values.type,
          code: values.code,
          level: parentNode ? parentNode.level + 1 : 0,
          parentId: parentNode?.id || null,
          description: values.description,
          equipmentCount: 0,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        if (parentNode) {
          addChildNode(treeData, parentNode.id, newNode)
        } else {
          setTreeData([...treeData, newNode])
        }
        message.success(`分类 "${values.title}" 添加成功`)
      }

      setModalOpen(false)
      form.resetFields()
      setEditingNode(null)
      setParentNode(null)
    })
  }

  // 更新节点
  function updateNode(nodes: CategoryNode[], id: string, updatedNode: CategoryNode): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes[i] = updatedNode
        setTreeData([...nodes])
        return true
      }
      if (nodes[i].children) {
        if (updateNode(nodes[i].children!, id, updatedNode)) {
          return true
        }
      }
    }
    return false
  }

  // 添加子节点
  function addChildNode(nodes: CategoryNode[], parentId: string, newNode: CategoryNode): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === parentId) {
        if (!nodes[i].children) {
          nodes[i].children = []
        }
        nodes[i].children!.push(newNode)
        setTreeData([...nodes])
        return true
      }
      if (nodes[i].children) {
        if (addChildNode(nodes[i].children!, parentId, newNode)) {
          return true
        }
      }
    }
    return false
  }

  // 删除节点
  const handleDelete = (node: CategoryNode) => {
    deleteNode(treeData, node.id)
    message.success(`分类 "${node.title}" 已删除`)
  }

  function deleteNode(nodes: CategoryNode[], id: string): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1)
        setTreeData([...nodes])
        return true
      }
      if (nodes[i].children) {
        if (deleteNode(nodes[i].children!, id)) {
          setTreeData([...nodes])
          return true
        }
      }
    }
    return false
  }

  // 树形数据渲染
  const renderTreeNodes = (nodes: CategoryNode[]): any[] => {
    return nodes.map(node => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <span>{categoryTypeMap[node.type].icon}</span>
            <span style={{ fontWeight: 500 }}>{node.title}</span>
            <Tag color={categoryTypeMap[node.type].color} style={{ fontSize: 11 }}>
              {node.code}
            </Tag>
            {node.equipmentCount > 0 && (
              <Tag color="default" style={{ fontSize: 11 }}>
                {node.equipmentCount}台
              </Tag>
            )}
          </Space>
          <Space size="small" onClick={e => e.stopPropagation()}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => viewDetail(node)}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openAddModal(node)}
            >
              新增
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(node)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除"
              description="确定要删除该分类吗？子分类也会被删除。"
              onConfirm={() => handleDelete(node)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </div>
      ),
      key: node.key,
      children: node.children ? renderTreeNodes(node.children) : undefined,
    }))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          设备分类管理
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="分类总数"
                value={stats.totalCategories}
                suffix="个"
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="设备总数"
                value={stats.totalEquipment}
                suffix="台"
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="按工艺"
                value={stats.processCategories}
                suffix="个"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="按功能"
                value={stats.functionCategories}
                suffix="个"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="按规格"
                value={stats.specCategories}
                suffix="个"
                valueStyle={{ color: '#9254DE' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        title="分类树"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal(null)}>
            新增根分类
          </Button>
        }
      >
        <Tree
          defaultExpandAll
          showIcon
          switcherIcon={<SettingOutlined />}
          treeData={renderTreeNodes(treeData)}
          style={{ backgroundColor: '#fafafa', padding: 16, borderRadius: 4 }}
        />
      </Card>

      {/* 新增/编辑分类弹窗 */}
      <Modal
        title={editingNode ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingNode(null)
          setParentNode(null)
        }}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="title"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="分类类型"
                rules={[{ required: true, message: '请选择分类类型' }]}
              >
                <Select placeholder="请选择分类类型">
                  <Option value="process">按工艺</Option>
                  <Option value="function">按功能</Option>
                  <Option value="specification">按规格</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="分类编码"
                rules={[{ required: true, message: '请输入分类编码' }]}
              >
                <Input placeholder="如: PROC-01" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="分类描述">
            <TextArea rows={4} placeholder="请输入分类描述" />
          </Form.Item>

          {parentNode && (
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <p style={{ margin: 0 }}>
                <strong>父级分类：</strong>
                {categoryTypeMap[parentNode.type].icon} {parentNode.title} ({parentNode.code})
              </p>
            </Card>
          )}
        </Form>
      </Modal>

      {/* 分类详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOutlined />
            <span>分类详情</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedNode(null)
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedNode && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="分类名称">{selectedNode.title}</Descriptions.Item>
                <Descriptions.Item label="分类编码">{selectedNode.code}</Descriptions.Item>
                <Descriptions.Item label="分类类型">
                  <span>
                    {categoryTypeMap[selectedNode.type].icon} {categoryTypeMap[selectedNode.type].label}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="层级">{selectedNode.level}</Descriptions.Item>
                <Descriptions.Item label="设备数量">{selectedNode.equipmentCount} 台</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={selectedNode.active ? 'green' : 'red'}>
                    {selectedNode.active ? '启用' : '停用'}
                  </Tag>
                </Descriptions.Item>
                {selectedNode.parentId && (
                  <Descriptions.Item label="父级ID" span={2}>
                    {selectedNode.parentId}
                  </Descriptions.Item>
                )}
                {selectedNode.description && (
                  <Descriptions.Item label="分类描述" span={2}>
                    {selectedNode.description}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="创建时间">
                  {new Date(selectedNode.createdAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {new Date(selectedNode.updatedAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedNode.children && selectedNode.children.length > 0 && (
              <Card size="small" title="子分类列表">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedNode.children.map(child => (
                    <Card key={child.id} size="small" style={{ marginBottom: 8 }}>
                      <Space>
                        <span>{categoryTypeMap[child.type].icon}</span>
                        <strong>{child.title}</strong>
                        <Tag color={categoryTypeMap[child.type].color}>{child.code}</Tag>
                        <span style={{ color: '#666' }}>{child.equipmentCount} 台设备</span>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
