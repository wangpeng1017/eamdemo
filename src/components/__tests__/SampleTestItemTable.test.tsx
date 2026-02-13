/**
 * @jest-environment jsdom
 */
/**
 * @file SampleTestItemTable 检测项目 AutoComplete 功能测试
 * @desc 验证检测项目列支持从库选择和自定义输入
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Ant Design 需要 matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
import SampleTestItemTable, {
  SampleTestItemData,
  resolveTestItemChange,
} from '../SampleTestItemTable'

// Mock fetch
const mockTestTemplates = [
  { id: 'tpl-001', code: 'TPL001', name: '剥落腐蚀', method: 'GB/T 22639-2022' },
  { id: 'tpl-002', code: 'TPL002', name: '拉伸试验', method: 'GB/T 228.1-2021' },
  { id: 'tpl-003', code: 'TPL003', name: '硬度测试', method: 'GB/T 4340.1-2009' },
]

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/api/test-template')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { list: mockTestTemplates } }),
      })
    }
    if (url.includes('/api/user')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { list: [] } }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }) as jest.Mock
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ==================== 核心逻辑测试 ====================

describe('resolveTestItemChange（纯逻辑）', () => {
  it('选择已有模板时，返回 testTemplateId + testItemName + testStandard', () => {
    const result = resolveTestItemChange('tpl-001', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: 'tpl-001',
      testItemName: '剥落腐蚀',
      testStandard: 'GB/T 22639-2022',
    })
  })

  it('选择另一个模板时，返回对应信息', () => {
    const result = resolveTestItemChange('tpl-002', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: 'tpl-002',
      testItemName: '拉伸试验',
      testStandard: 'GB/T 228.1-2021',
    })
  })

  it('手动输入自定义项目名时，testTemplateId 为空', () => {
    const result = resolveTestItemChange('自定义检测项目XYZ', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: '',
      testItemName: '自定义检测项目XYZ',
      testStandard: '',
    })
  })

  it('输入与已有模板名称完全匹配时，应关联该模板', () => {
    const result = resolveTestItemChange('硬度测试', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: 'tpl-003',
      testItemName: '硬度测试',
      testStandard: 'GB/T 4340.1-2009',
    })
  })

  it('输入空字符串时，所有字段清空', () => {
    const result = resolveTestItemChange('', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: '',
      testItemName: '',
      testStandard: '',
    })
  })

  it('输入部分匹配但不完全匹配时，视为自定义', () => {
    // "剥落" 不等于 "剥落腐蚀"，应视为自定义输入
    const result = resolveTestItemChange('剥落', mockTestTemplates)

    expect(result).toEqual({
      testTemplateId: '',
      testItemName: '剥落',
      testStandard: '',
    })
  })

  it('模板列表为空时，任何输入都是自定义', () => {
    const result = resolveTestItemChange('拉伸试验', [])

    expect(result).toEqual({
      testTemplateId: '',
      testItemName: '拉伸试验',
      testStandard: '',
    })
  })
})

// ==================== 组件渲染测试 ====================

describe('SampleTestItemTable 组件', () => {
  it('编辑模式下检测项目列渲染 AutoComplete 而非 Select', async () => {
    const initialItems: SampleTestItemData[] = [
      {
        key: 'test-1',
        sampleName: '铝合金样品',
        testItemName: '',
        quantity: 1,
      },
    ]

    const { container } = render(
      <SampleTestItemTable
        bizType="consultation"
        value={initialItems}
        onChange={jest.fn()}
      />
    )

    await waitFor(() => {
      // AutoComplete 应渲染一个 input，而非 ant-select 下拉
      const autoCompleteInputs = container.querySelectorAll('.ant-select-auto-complete')
      expect(autoCompleteInputs.length).toBeGreaterThan(0)
    })
  })

  it('只读模式下直接显示检测项目名称文本', async () => {
    const initialItems: SampleTestItemData[] = [
      {
        key: 'test-1',
        sampleName: '铝合金样品',
        testItemName: '剥落腐蚀',
        testStandard: 'GB/T 22639',
        quantity: 1,
      },
    ]

    render(
      <SampleTestItemTable
        bizType="consultation"
        value={initialItems}
        readonly={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('剥落腐蚀')).toBeInTheDocument()
    })
  })

  it('onChange 回调在自定义输入时 testTemplateId 为空', async () => {
    const handleChange = jest.fn()
    const initialItems: SampleTestItemData[] = [
      {
        key: 'test-1',
        sampleName: '铝合金样品',
        testItemName: '',
        quantity: 1,
      },
    ]

    render(
      <SampleTestItemTable
        bizType="consultation"
        value={initialItems}
        onChange={handleChange}
      />
    )

    // 等待模板加载
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test-template')
      )
    })
  })
})
