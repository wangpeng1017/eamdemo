
'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, List, Button, Space } from 'antd'
import { HolderOutlined } from '@ant-design/icons'

interface Item {
  id: string
  [key: string]: any
}

interface DragSortListProps {
  items: Item[]
  onChange?: (items: Item[]) => void
  renderItem?: (item: Item, index: number) => React.ReactNode
}

function SortableItem({ id, children, index }: { id: string; children: React.ReactNode; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px',
          marginBottom: '8px',
          background: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          cursor: 'move',
        }}
      >
        <span
          style={{
            marginRight: '12px',
            cursor: 'grab',
            color: '#999',
          }}
          {...listeners}
        >
          <HolderOutlined />
        </span>
        <span style={{ flex: 1 }}>
          {children}
        </span>
        <span style={{ color: '#999', fontSize: '12px' }}>
          #{index + 1}
        </span>
      </div>
    </div>
  )
}

export default function DragSortList({ items, onChange, renderItem }: DragSortListProps) {
  const [localItems, setLocalItems] = useState<Item[]>(items)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex((item) => item.id === active.id)
      const newIndex = localItems.findIndex((item) => item.id === over.id)
      const newItems = arrayMove(localItems, oldIndex, newIndex)
      setLocalItems(newItems)
      if (onChange) {
        onChange(newItems)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ minHeight: 200 }}>
          {localItems.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              index={index}
            >
              {renderItem ? renderItem(item, index) : (
                <div>
                  {item.name || item.reportNo || item.id}
                </div>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
