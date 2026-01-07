'use client'

import { useState, useEffect } from 'react'
import { Select, SelectProps } from 'antd'

interface User {
    id: string
    name: string
    username: string
    deptId?: string
    dept?: { name: string }
}

interface UserSelectProps extends Omit<SelectProps, 'options'> {
    value?: string
    onChange?: (value: string) => void
}

export default function UserSelect({ value, onChange, ...props }: UserSelectProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                const res = await fetch('/api/user?status=1&pageSize=1000')
                const json = await res.json()
                setUsers(json.list || [])
            } catch (error) {
                console.error('获取用户列表失败:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    return (
        <Select
            showSearch
            allowClear
            loading={loading}
            optionFilterProp="label"
            value={value}
            onChange={onChange}
            options={users.map(u => ({
                value: u.name,
                label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
            }))}
            {...props}
        />
    )
}
