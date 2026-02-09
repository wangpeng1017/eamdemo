'use client'

/**
 * @file 材料级测试要求可编辑表格
 * @desc 对齐 Excel 委托单模板的材料级测试区域
 */

import { useState, useCallback } from 'react'
import { Table, Input, Button, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

export interface MaterialTestData {
    key: string
    sampleIndex?: string          // 对应样品序号
    materialName: string          // 材料名称(材质)
    materialCode?: string         // 材料牌号
    testItemName: string          // 测试项目
    testStandard?: string         // 测试标准
    testMethod?: string           // 测试方法/条件
    judgmentStandard?: string     // 判定依据
    materialSupplier?: string     // 材料供应商
    materialSpec?: string         // 材料规格
    materialSampleStatus?: string // 样件状态
    specimenCount?: string        // 送检数量
    testRemark?: string           // 备注
}

interface MaterialTestTableProps {
    value?: MaterialTestData[]
    onChange?: (items: MaterialTestData[]) => void
    readonly?: boolean
}

export default function MaterialTestTable({ value = [], onChange, readonly = false }: MaterialTestTableProps) {
    const [items, setItems] = useState<MaterialTestData[]>(value)

    const updateItems = useCallback((newItems: MaterialTestData[]) => {
        setItems(newItems)
        onChange?.(newItems)
    }, [onChange])

    const handleAdd = () => {
        const newItem: MaterialTestData = {
            key: `mat_${Date.now()}`,
            materialName: '',
            testItemName: '',
        }
        updateItems([...items, newItem])
    }

    const handleDelete = (key: string) => {
        updateItems(items.filter(i => i.key !== key))
    }

    const updateItem = (key: string, field: keyof MaterialTestData, value: any) => {
        updateItems(items.map(i => i.key === key ? { ...i, [field]: value } : i))
    }

    const columns = [
        {
            title: '序号',
            width: 45,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: '样品序号',
            dataIndex: 'sampleIndex',
            width: 70,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="序号"
                        onChange={e => updateItem(record.key, 'sampleIndex', e.target.value)} />
                ),
        },
        {
            title: '材料名称 *',
            dataIndex: 'materialName',
            width: 120,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="材料名称(材质)"
                        onChange={e => updateItem(record.key, 'materialName', e.target.value)} />
                ),
        },
        {
            title: '材料牌号',
            dataIndex: 'materialCode',
            width: 100,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="牌号"
                        onChange={e => updateItem(record.key, 'materialCode', e.target.value)} />
                ),
        },
        {
            title: '测试项目 *',
            dataIndex: 'testItemName',
            width: 130,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="测试项目"
                        onChange={e => updateItem(record.key, 'testItemName', e.target.value)} />
                ),
        },
        {
            title: '测试标准',
            dataIndex: 'testStandard',
            width: 110,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="标准号"
                        onChange={e => updateItem(record.key, 'testStandard', e.target.value)} />
                ),
        },
        {
            title: '测试方法/条件',
            dataIndex: 'testMethod',
            width: 120,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="方法/条件"
                        onChange={e => updateItem(record.key, 'testMethod', e.target.value)} />
                ),
        },
        {
            title: '判定依据',
            dataIndex: 'judgmentStandard',
            width: 120,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="判定依据"
                        onChange={e => updateItem(record.key, 'judgmentStandard', e.target.value)} />
                ),
        },
        {
            title: '材料供应商',
            dataIndex: 'materialSupplier',
            width: 110,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="供应商"
                        onChange={e => updateItem(record.key, 'materialSupplier', e.target.value)} />
                ),
        },
        {
            title: '材料规格',
            dataIndex: 'materialSpec',
            width: 100,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="规格/牌号"
                        onChange={e => updateItem(record.key, 'materialSpec', e.target.value)} />
                ),
        },
        {
            title: '样件状态',
            dataIndex: 'materialSampleStatus',
            width: 90,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="粒料/样条等"
                        onChange={e => updateItem(record.key, 'materialSampleStatus', e.target.value)} />
                ),
        },
        {
            title: '送检数量',
            dataIndex: 'specimenCount',
            width: 80,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="数量"
                        onChange={e => updateItem(record.key, 'specimenCount', e.target.value)} />
                ),
        },
        {
            title: '备注',
            dataIndex: 'testRemark',
            width: 100,
            render: (text: string, record: MaterialTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="备注"
                        onChange={e => updateItem(record.key, 'testRemark', e.target.value)} />
                ),
        },
        ...(!readonly ? [{
            title: '操作',
            width: 50,
            render: (_: any, record: MaterialTestData) => (
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
                        添加材料测试项
                    </Button>
                </div>
            )}
            <Table
                columns={columns}
                dataSource={items}
                rowKey="key"
                size="small"
                pagination={false}
                scroll={{ x: 1400 }}
                locale={{ emptyText: '暂无材料级测试项，点击"添加材料测试项"开始录入' }}
            />
        </div>
    )
}
