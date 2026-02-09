'use client'

/**
 * @file 样品信息可编辑表格
 * @desc 对齐 Excel 委托单模板的样品信息区域
 */

import { useState, useCallback } from 'react'
import { Table, Input, InputNumber, Button, Space, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

export interface SampleInfoData {
    key: string
    name: string              // 样品名称
    partNo?: string           // 零件号
    material?: string         // 材质
    color?: string            // 颜色
    weight?: string           // 重量
    supplier?: string         // 供应商
    oem?: string              // 主机厂 OEM
    quantity: number           // 数量
    sampleCondition?: string  // 样品状态描述
    remark?: string           // 备注
}

interface SampleInfoTableProps {
    value?: SampleInfoData[]
    onChange?: (items: SampleInfoData[]) => void
    readonly?: boolean
}

export default function SampleInfoTable({ value = [], onChange, readonly = false }: SampleInfoTableProps) {
    const [items, setItems] = useState<SampleInfoData[]>(value)

    const updateItems = useCallback((newItems: SampleInfoData[]) => {
        setItems(newItems)
        onChange?.(newItems)
    }, [onChange])

    const handleAdd = () => {
        const newItem: SampleInfoData = {
            key: `sample_${Date.now()}`,
            name: '',
            quantity: 1,
        }
        updateItems([...items, newItem])
    }

    const handleDelete = (key: string) => {
        updateItems(items.filter(i => i.key !== key))
    }

    const updateItem = (key: string, field: keyof SampleInfoData, value: any) => {
        updateItems(items.map(i => i.key === key ? { ...i, [field]: value } : i))
    }

    const columns = [
        {
            title: '序号',
            width: 50,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: '样品名称 *',
            dataIndex: 'name',
            width: 140,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="样品名称"
                        onChange={e => updateItem(record.key, 'name', e.target.value)} />
                ),
        },
        {
            title: '零件号',
            dataIndex: 'partNo',
            width: 110,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="Part No."
                        onChange={e => updateItem(record.key, 'partNo', e.target.value)} />
                ),
        },
        {
            title: '材质',
            dataIndex: 'material',
            width: 100,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="材质"
                        onChange={e => updateItem(record.key, 'material', e.target.value)} />
                ),
        },
        {
            title: '颜色',
            dataIndex: 'color',
            width: 80,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="颜色"
                        onChange={e => updateItem(record.key, 'color', e.target.value)} />
                ),
        },
        {
            title: '重量',
            dataIndex: 'weight',
            width: 80,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="g/kg"
                        onChange={e => updateItem(record.key, 'weight', e.target.value)} />
                ),
        },
        {
            title: '供应商',
            dataIndex: 'supplier',
            width: 120,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="供应商"
                        onChange={e => updateItem(record.key, 'supplier', e.target.value)} />
                ),
        },
        {
            title: 'OEM/主机厂',
            dataIndex: 'oem',
            width: 110,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="主机厂"
                        onChange={e => updateItem(record.key, 'oem', e.target.value)} />
                ),
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            width: 70,
            render: (val: number, record: SampleInfoData) =>
                readonly ? val : (
                    <InputNumber size="small" min={1} value={val} style={{ width: '100%' }}
                        onChange={v => updateItem(record.key, 'quantity', v || 1)} />
                ),
        },
        {
            title: '样品状态',
            dataIndex: 'sampleCondition',
            width: 100,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="到样状态"
                        onChange={e => updateItem(record.key, 'sampleCondition', e.target.value)} />
                ),
        },
        {
            title: '备注',
            dataIndex: 'remark',
            width: 100,
            render: (text: string, record: SampleInfoData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="备注"
                        onChange={e => updateItem(record.key, 'remark', e.target.value)} />
                ),
        },
        ...(!readonly ? [{
            title: '操作',
            width: 50,
            render: (_: any, record: SampleInfoData) => (
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.key)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        }] : []),
    ]

    return (
        <div>
            {!readonly && (
                <div style={{ marginBottom: 8, textAlign: 'right' }}>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
                        添加样品
                    </Button>
                </div>
            )}
            <Table
                columns={columns}
                dataSource={items}
                rowKey="key"
                size="small"
                pagination={false}
                scroll={{ x: 1100 }}
                locale={{ emptyText: '暂无样品，点击"添加样品"开始录入' }}
            />
        </div>
    )
}
