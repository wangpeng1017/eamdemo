'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '请输入内容...',
  minHeight = '150px'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none'
      }
    }
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return <div className="p-4 text-center text-gray-500">加载编辑器...</div>
  }

  return (
    <div className="rich-text-editor" style={{ minHeight }}>
      {/* 工具栏 */}
      <div className="toolbar">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          title="标题1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          title="标题2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          title="标题3"
        >
          H3
        </button>
        <div className="toolbar-divider" />
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="粗体"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="斜体"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          title="下划线"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          title="删除线"
        >
          <s>S</s>
        </button>
        <div className="toolbar-divider" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          title="无序列表"
        >
          • 列表
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          title="有序列表"
        >
          1. 列表
        </button>
        <div className="toolbar-divider" />
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
          title="左对齐"
        >
          左
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
          title="居中"
        >
          中
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
          title="右对齐"
        >
          右
        </button>
        <div className="toolbar-divider" />
        <button
          onClick={() => {
            const url = window.prompt('请输入链接地址:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          title="插入链接"
        >
          🔗
        </button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="toolbar-btn"
          title="移除链接"
          disabled={!editor.isActive('link')}
        >
          ❌
        </button>
        <div className="toolbar-divider" />
        <button
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className="toolbar-btn"
          title="清除格式"
        >
          清除格式
        </button>
      </div>

      {/* 编辑器内容区 */}
      <EditorContent editor={editor} />
    </div>
  )
}
