
'use client'

import { useState, useEffect } from 'react'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readonly?: boolean
  height?: string
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  readonly = false,
  height = '500px'
}: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null)

  // 工具栏配置
  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: [
      'group-video' // 排除视频功能
    ]
  }

  // 编辑器配置
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly: readonly,
    MENU_CONF: {
      uploadImage: {
        // 自定义图片上传
        async customUpload(file: File, insertFn: (url: string) => void) {
          // TODO: 实现图片上传到服务器
          // 目前使用本地预览URL
          const url = URL.createObjectURL(file)
          insertFn(url)
        }
      }
    }
  }

  // 及时销毁 editor
  useEffect(() => {
    return () => {
      if (editor == null) return
      editor.destroy()
      setEditor(null)
    }
  }, [editor])

  // 初始化内容
  useEffect(() => {
    if (editor == null) return
    if (value && editor.getHtml() !== value) {
      editor.setHtml(value)
    }
  }, [editor, value])

  const handleChange = (editor: IDomEditor) => {
    const html = editor.getHtml()
    if (onChange) {
      onChange(html)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #ccc' }}
      />
      <Editor
        defaultContent={[]} // 初始内容为空，通过useEffect设置
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        onChange={handleChange}
        mode="default"
        style={{ height, overflowY: 'hidden' }}
      />
    </div>
  )
}
