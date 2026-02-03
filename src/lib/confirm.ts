/**
 * @file 统一提示工具库
 * @desc 规范系统中所有提示的UI风格，确保一致性
 * @input: 无
 * @output: showConfirm/showSuccess/showError/showWarning/showInfo
 */

import React from 'react'
import { Modal, message } from 'antd'
import type { ModalProps } from 'antd'

/**
 * 确认对话框 - 用于需要用户确认的重要操作
 * @param title 标题
 * @param content 内容（字符串或 ReactNode）
 * @param onOk 确认回调
 * @param options 可选配置
 */
export function showConfirm(
  title: string,
  content: string | React.ReactNode,
  onOk: () => void | Promise<void>,
  options?: {
    okText?: string
    cancelText?: string
    okType?: 'primary' | 'danger'
    width?: number | string
    icon?: React.ReactNode
    cancelButtonProps?: ModalProps['cancelButtonProps']
  }
) {
  return Modal.confirm({
    title,
    content,
    okText: options?.okText || '确认',
    cancelText: options?.cancelText || '取消',
    okType: options?.okType || 'primary',
    width: options?.width || 420,
    centered: true,
    icon: options?.icon,
    cancelButtonProps: options?.cancelButtonProps,
    onOk,
  })
}

/**
 * 警告对话框 - 用于阻止用户继续操作的警告
 * @param title 标题
 * @param content 内容（字符串或 ReactNode）
 * @param options 可选配置
 */
export function showWarning(
  title: string,
  content: string | React.ReactNode,
  options?: {
    okText?: string
    width?: number | string
    icon?: React.ReactNode
    cancelButtonProps?: ModalProps['cancelButtonProps']
  }
) {
  return Modal.warning({
    title,
    content,
    okText: options?.okText || '知道了',
    centered: true,
    width: options?.width || 420,
    icon: options?.icon,
    cancelButtonProps: options?.cancelButtonProps,
  })
}

/**
 * 成功提示 - 用于操作成功的即时反馈
 * @param content 提示内容
 * @param duration 持续时间（秒），默认3秒
 */
export function showSuccess(content: string, duration = 3) {
  return message.success(content, duration)
}

/**
 * 错误提示 - 用于操作失败的即时反馈
 * @param content 提示内容
 * @param duration 持续时间（秒），默认3秒
 */
export function showError(content: string, duration = 3) {
  return message.error(content, duration)
}

/**
 * 警告提示（轻量级）- 用于一般性警告的即时反馈
 * @param content 提示内容
 * @param duration 持续时间（秒），默认3秒
 */
export function showWarningMessage(content: string, duration = 3) {
  return message.warning(content, duration)
}

/**
 * 信息提示 - 用于一般性信息的即时反馈
 * @param content 提示内容
 * @param duration 持续时间（秒），默认3秒
 */
export function showInfo(content: string, duration = 3) {
  return message.info(content, duration)
}

/**
 * 加载提示 - 用于异步操作过程中的加载状态
 * @param content 提示内容
 * @param key 可选的标识符，用于更新或关闭此提示
 */
export function showLoading(content = '加载中...', key?: string) {
  if (key) {
    return message.loading({ content, key, duration: 0 })
  }
  return message.loading(content, 0) // 0 表示不自动关闭
}

/**
 * 使用规则说明：
 *
 * 1. 需要用户确认的操作 → 使用 showConfirm()
 *    - 删除操作
 *    - 提交重要数据
 *    - 不可逆的操作
 *
 * 2. 阻止操作的警告 → 使用 showWarning()
 *    - 表单验证失败
 *    - 权限不足
 *    - 数据状态不允许
 *
 * 3. 操作结果反馈 → 使用 showSuccess/showError
 *    - CRUD操作成功/失败
 *    - 数据保存成功/失败
 *
 * 4. 一般性提示 → 使用 showWarningMessage/showInfo
 *    - 非阻塞性警告
 *    - 辅助信息
 */
