'use client'

/**
 * @file 零部件级测试要求可编辑表格
 * @desc 对齐 Excel 委托单模板的零部件级测试区域，含禁用物质预置模板
 */

import { useState, useCallback } from 'react'
import { Table, Input, InputNumber, Button, Space, Popconfirm, Dropdown } from 'antd'
import { PlusOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

export interface ComponentTestData {
    key: string
    sampleIndex?: string        // 对应样品序号
    sampleName: string          // 样品名称
    testItemName: string        // 测试项目
    testStandard?: string       // 测试标准
    testMethod?: string         // 测试方法/条件
    judgmentStandard?: string   // 判定依据
    samplingLocation?: string   // 样品描述及取样位置
    specimenCount?: string      // 送检数量
    testRemark?: string         // 备注
}

// 禁用物质预置模板
const PROHIBITED_SUBSTANCE_TEMPLATES: Omit<ComponentTestData, 'key'>[] = [
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: 'ELV(Pb,Cd,Hg,Cr6+,PBB,PBDE)',
        testStandard: '',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '所有零部件',
        specimenCount: '完整样品',
        testRemark: '提供总成级别的BOM清单',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: '石棉测试',
        testStandard: 'CH945-8309',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '非金属零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: '多环芳烃（PAHs）',
        testStandard: 'CH945-8309CR',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '非金属零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: 'REACH-SVHC',
        testStandard: '',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '所有零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: 'REACH-附录17',
        testStandard: '',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '所有零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: 'POPS',
        testStandard: '',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '非金属零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: 'GADSL',
        testStandard: 'CH980-2152',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '所有零部件及材料',
        specimenCount: '完整样品/材料',
        testRemark: '',
    },
]

// 散发性实验预置
const VOC_TEMPLATES: Omit<ComponentTestData, 'key'>[] = [
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: '雾化测试',
        testStandard: 'CH945-4051',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '',
        specimenCount: '完整样品一个',
        testRemark: '铝箔包装',
    },
    {
        sampleIndex: '',
        sampleName: '',
        testItemName: '袋式法VOC',
        testStandard: '',
        testMethod: '',
        judgmentStandard: '',
        samplingLocation: '',
        specimenCount: '完整总成样品',
        testRemark: '铝箔包装',
    },
]

interface ComponentTestTableProps {
    value?: ComponentTestData[]
    onChange?: (items: ComponentTestData[]) => void
    readonly?: boolean
}

export default function ComponentTestTable({ value = [], onChange, readonly = false }: ComponentTestTableProps) {
    const [items, setItems] = useState<ComponentTestData[]>(value)

    const updateItems = useCallback((newItems: ComponentTestData[]) => {
        setItems(newItems)
        onChange?.(newItems)
    }, [onChange])

    const handleAdd = () => {
        const newItem: ComponentTestData = {
            key: `comp_${Date.now()}`,
            sampleName: '',
            testItemName: '',
        }
        updateItems([...items, newItem])
    }

    const handleDelete = (key: string) => {
        updateItems(items.filter(i => i.key !== key))
    }

    const updateItem = (key: string, field: keyof ComponentTestData, value: any) => {
        updateItems(items.map(i => i.key === key ? { ...i, [field]: value } : i))
    }

    // 批量添加预置模板
    const handleAddTemplates = (templates: Omit<ComponentTestData, 'key'>[]) => {
        const newItems = templates.map((t, i) => ({
            ...t,
            key: `comp_tpl_${Date.now()}_${i}`,
        }))
        updateItems([...items, ...newItems])
    }

    const presetMenuItems: MenuProps['items'] = [
        {
            key: 'prohibited',
            label: '禁用物质测试（7项）',
            onClick: () => handleAddTemplates(PROHIBITED_SUBSTANCE_TEMPLATES),
        },
        {
            key: 'voc',
            label: '散发性实验 VOC（2项）',
            onClick: () => handleAddTemplates(VOC_TEMPLATES),
        },
        {
            key: 'all',
            label: '全部预置（9项）',
            onClick: () => handleAddTemplates([...PROHIBITED_SUBSTANCE_TEMPLATES, ...VOC_TEMPLATES]),
        },
    ]

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
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="对应样品"
                        onChange={e => updateItem(record.key, 'sampleIndex', e.target.value)} />
                ),
        },
        {
            title: '样品名称 *',
            dataIndex: 'sampleName',
            width: 120,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="样品名称"
                        onChange={e => updateItem(record.key, 'sampleName', e.target.value)} />
                ),
        },
        {
            title: '测试项目 *',
            dataIndex: 'testItemName',
            width: 150,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="测试项目"
                        onChange={e => updateItem(record.key, 'testItemName', e.target.value)} />
                ),
        },
        {
            title: '测试标准',
            dataIndex: 'testStandard',
            width: 120,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="标准号"
                        onChange={e => updateItem(record.key, 'testStandard', e.target.value)} />
                ),
        },
        {
            title: '测试方法/条件',
            dataIndex: 'testMethod',
            width: 130,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="方法/条件"
                        onChange={e => updateItem(record.key, 'testMethod', e.target.value)} />
                ),
        },
        {
            title: '判定依据',
            dataIndex: 'judgmentStandard',
            width: 130,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="判定依据"
                        onChange={e => updateItem(record.key, 'judgmentStandard', e.target.value)} />
                ),
        },
        {
            title: '取样位置/样品描述',
            dataIndex: 'samplingLocation',
            width: 140,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="取样位置"
                        onChange={e => updateItem(record.key, 'samplingLocation', e.target.value)} />
                ),
        },
        {
            title: '送检数量',
            dataIndex: 'specimenCount',
            width: 90,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="数量"
                        onChange={e => updateItem(record.key, 'specimenCount', e.target.value)} />
                ),
        },
        {
            title: '备注',
            dataIndex: 'testRemark',
            width: 100,
            render: (text: string, record: ComponentTestData) =>
                readonly ? text : (
                    <Input size="small" value={text} placeholder="备注"
                        onChange={e => updateItem(record.key, 'testRemark', e.target.value)} />
                ),
        },
        ...(!readonly ? [{
            title: '操作',
            width: 50,
            render: (_: any, record: ComponentTestData) => (
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.key)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        }] : []),
    ]

    return (
        <div>
            {!readonly && (
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Dropdown menu={{ items: presetMenuItems }}>
                        <Button size="small" icon={<ExperimentOutlined />}>
                            一键添加预置测试
                        </Button>
                    </Dropdown>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
                        添加测试项
                    </Button>
                </div>
            )}
            <Table
                columns={columns}
                dataSource={items}
                rowKey="key"
                size="small"
                pagination={false}
                scroll={{ x: 1200 }}
                locale={{ emptyText: '暂无零部件测试项，点击"添加测试项"或"一键添加预置测试"' }}
            />
        </div>
    )
}
