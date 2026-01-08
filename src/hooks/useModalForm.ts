/**
 * @file useModalForm.ts
 * @desc 模态框表单 Hook，处理新增/编辑模态框和表单
 */

import { useState, useCallback } from 'react'
import { Form, ModalProps } from 'antd'

interface UseModalFormReturn<T> {
  modalOpen: boolean
  editingId: string | null
  form: any
  openModal: () => void
  openEditModal: (record: T) => void
  closeModal: () => void
  handleSubmit: (onSubmit: (values: any) => Promise<void>) => Promise<void>
  modalProps: ModalProps
}

/**
 * 模态框表单 Hook
 */
export function useModalForm<T extends { id: string }>(
  initialValues?: any
): UseModalFormReturn<T> {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const openModal = useCallback(() => {
    setEditingId(null)
    form.resetFields()
    if (initialValues) {
      form.setFieldsValue(initialValues)
    }
    setModalOpen(true)
  }, [form, initialValues])

  const openEditModal = useCallback(
    (record: T) => {
      setEditingId(record.id)
      form.setFieldsValue(record)
      setModalOpen(true)
    },
    [form]
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    form.resetFields()
  }, [form])

  const handleSubmit = useCallback(
    async (onSubmit: (values: any) => Promise<void>) => {
      try {
        const values = await form.validateFields()
        await onSubmit(values)
        closeModal()
        return true
      } catch (error) {
        return false
      }
    },
    [form, closeModal]
  )

  const modalProps: ModalProps = {
    open: modalOpen,
    onCancel: closeModal,
    destroyOnClose: true,
  }

  return {
    modalOpen,
    editingId,
    form,
    openModal,
    openEditModal,
    closeModal,
    handleSubmit,
    modalProps,
  }
}
