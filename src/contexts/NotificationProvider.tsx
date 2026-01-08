/**
 * @file NotificationProvider.tsx
 * @desc 通知中心上下文，提供全局通知管理
 */

'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Badge, Dropdown, List, Typography, Button, Empty, Tag } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Text } = Typography

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
  onClick?: () => void
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString() + Math.random(),
        read: false,
        createdAt: new Date(),
      }
      setNotifications((prev) => [newNotification, ...prev])
    },
    []
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

/**
 * 通知中心组件
 */
export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } =
    useNotification()

  const notificationContent = (
    <div style={{ width: 380, maxHeight: 500 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>通知 ({unreadCount})</Text>
        {notifications.length > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            全部已读
          </Button>
        )}
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无通知"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '12px 16px',
                  background: item.read ? 'transparent' : '#f5f5f5',
                  cursor: item.onClick || item.link ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick()
                    markAsRead(item.id)
                  } else if (item.link) {
                    window.location.href = item.link
                    markAsRead(item.id)
                  } else {
                    markAsRead(item.id)
                  }
                }}
              >
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!item.read && <div style={{ width: 6, height: 6, background: '#1890ff', borderRadius: '50%' }} />}
                        <Text strong={!item.read}>{item.title}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.message}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation()
                        clearNotification(item.id)
                      }}
                    >
                      ×
                    </Button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={
                      item.type === 'error' ? 'error' :
                      item.type === 'warning' ? 'warning' :
                      item.type === 'success' ? 'success' : 'default'
                    }>
                      {item.type === 'error' ? '错误' :
                       item.type === 'warning' ? '警告' :
                       item.type === 'success' ? '成功' : '信息'}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )

  const items: MenuProps['items'] = [
    {
      key: 'notification-center',
      label: notificationContent,
    },
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{ fontSize: 16 }}
          title="通知中心"
        />
      </Badge>
    </Dropdown>
  )
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}
