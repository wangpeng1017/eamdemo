
'use client'

import { useState } from 'react'
import { Upload, message, Image } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  disabled?: boolean
}

export default function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>(
    value ? [{
      uid: '-1',
      name: 'image.png',
      status: 'done',
      url: value,
    }] : []
  )

  const handleChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'done') {
      const url = info.file.response?.url || URL.createObjectURL(info.file.originFileObj || info.file)
      setFileList([{
        uid: '-1',
        name: info.file.name,
        status: 'done',
        url,
      }])
      if (onChange) {
        onChange(url)
      }
    } else if (info.file.status === 'error') {
      message.error('上传失败')
    }
  }

  const handleRemove = () => {
    setFileList([])
    if (onChange) {
      onChange('')
    }
  }

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </button>
  )

  return (
    <div>
      <Upload
        name="file"
        listType="picture-card"
        className="avatar-uploader"
        fileList={fileList}
        disabled={disabled}
        action="/api/upload/image"
        onChange={handleChange}
        onRemove={handleRemove}
        maxCount={1}
        headers={{
          authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        }}
      >
        {fileList.length === 0 && uploadButton}
      </Upload>
      {value && (
        <div style={{ marginTop: 8 }}>
          <Image src={value} alt="预览" width={200} style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  )
}
