import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IntroBlockEditor,
  ImageBlockEditor,
  TableBlockEditor,
  YoutubeBlockEditor,
  ExerciseBlockEditor,
} from './ContentBlockEditor';

// Block Type Labels Mapping
const BLOCK_TYPE_LABEL = {
  intro: '📝 فقرة نصية',
  paragraph: '📝 فقرة نصية', // للتوافق مع البيانات القديمة
  image: '🖼️ صورة',
  table: '📊 جدول',
  youtube: '🎥 فيديو YouTube',
  exercise: '✏️ تمرين',
};

// Normalize block type (convert paragraph to intro)
const normalizeType = (type) => {
  if (type === 'paragraph') return 'intro';
  return type;
};

// Sortable Block Item
const SortableBlockItem = ({ block, onUpdate, onDelete, renderEditor }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        marginBottom: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#fff',
        position: 'relative',
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>
            {BLOCK_TYPE_LABEL[block.type] || 'نوع غير معروف'}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            padding: '4px 8px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          حذف
        </button>
      </div>

      {/* Block Editor */}
      <div style={{ padding: '16px' }}>
        {renderEditor(block, onUpdate)}
      </div>
    </div>
  );
};

// Ensure block has id and normalized type
const normalizeBlocks = (blocks) => {
  return (blocks || []).map(block => ({
    ...block,
    id: block.id || `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: normalizeType(block.type),
  }));
};

// Main Page Builder Component
export const PageBuilder = ({ blocks = [], onChange, onBlockDelete }) => {
  // Normalize blocks when loaded from API
  const [contentBlocks, setContentBlocks] = useState(() => normalizeBlocks(blocks));

  // Track if we're doing an internal update to avoid loops
  const isInternalUpdate = React.useRef(false);

  // Update when blocks prop changes (from API) - only when it's an external change
  useEffect(() => {
    // Skip if this update was triggered by our own onChange
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const normalized = normalizeBlocks(blocks);
    setContentBlocks(normalized);

    // Only call onChange if IDs were actually added (initial load from API)
    const hasNewIds = blocks.some((block, i) => !block.id && normalized[i]?.id);
    if (hasNewIds) {
      isInternalUpdate.current = true;
      onChange(normalized);
    }
  }, [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate unique ID for new blocks
  const generateBlockId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add new block
  const addBlock = (type) => {
    // Normalize type to ensure it's always intro (not paragraph)
    const normalizedType = normalizeType(type);
    const newBlock = {
      id: generateBlockId(),
      type: normalizedType,
      data: getDefaultBlockData(normalizedType),
    };
    const updatedBlocks = [...contentBlocks, newBlock];
    setContentBlocks(updatedBlocks);
    // Normalize all blocks before sending to parent
    isInternalUpdate.current = true;
    onChange(normalizeBlocks(updatedBlocks));
  };

  // Get default data for block type
  const getDefaultBlockData = (type) => {
    switch (type) {
      case 'intro':
        return { text: '' };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'table':
        return { title: '', headers: [''], rows: [] };
      case 'youtube':
        return { videoId: '', title: '' };
      case 'exercise':
        return {
          title: '',
          questions: [],
          showResultsImmediately: true,
          allowRetry: true
        };
      default:
        return {};
    }
  };

  // Update block
  const updateBlock = (updatedBlock) => {
    // Normalize type before updating
    const normalizedBlock = {
      ...updatedBlock,
      type: normalizeType(updatedBlock.type),
    };
    const updatedBlocks = contentBlocks.map(block =>
      block.id === normalizedBlock.id ? normalizedBlock : block
    );
    setContentBlocks(updatedBlocks);
    // Normalize all blocks before sending to parent
    isInternalUpdate.current = true;
    onChange(normalizeBlocks(updatedBlocks));
  };

  // Delete block
  const deleteBlock = (blockId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
      const updatedBlocks = contentBlocks.filter(block => block.id !== blockId);
      setContentBlocks(updatedBlocks);
      // Normalize all blocks before sending to parent
      isInternalUpdate.current = true;
      const normalized = normalizeBlocks(updatedBlocks);
      onChange(normalized);
      // Trigger auto-save if onBlockDelete is provided
      if (onBlockDelete) {
        onBlockDelete(normalized);
      }
    }
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setContentBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newBlocks = arrayMove(items, oldIndex, newIndex);
        // Normalize all blocks before sending to parent
        isInternalUpdate.current = true;
        onChange(normalizeBlocks(newBlocks));
        return newBlocks;
      });
    }
  };

  // Render block editor based on type
  const renderBlockEditor = (block, onUpdate) => {
    // Normalize type before rendering
    const normalizedType = normalizeType(block.type);
    switch (normalizedType) {
      case 'intro':
        return <IntroBlockEditor block={{ ...block, type: normalizedType }} onUpdate={onUpdate} />;
      case 'image':
        return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
      case 'table':
        return <TableBlockEditor block={block} onUpdate={onUpdate} />;
      case 'youtube':
        return <YoutubeBlockEditor block={block} onUpdate={onUpdate} />;
      case 'exercise':
        return <ExerciseBlockEditor block={block} onUpdate={onUpdate} />;
      default:
        return <div>نوع غير معروف</div>;
    }
  };

  return (
    <div style={{ direction: 'ltr', textAlign: 'left' }}>
      {/* Add Block Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <span style={{ fontWeight: '600', fontSize: '14px', marginRight: '8px', alignSelf: 'center' }}>
          إضافة عنصر:
        </span>
        <button
          type="button"
          onClick={() => addBlock('intro')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          📝 فقرة نصية
        </button>
        <button
          type="button"
          onClick={() => addBlock('image')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          🖼️ صورة
        </button>
        <button
          type="button"
          onClick={() => addBlock('table')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          📊 جدول
        </button>
        <button
          type="button"
          onClick={() => addBlock('youtube')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          🎥 فيديو YouTube
        </button>
        <button
          type="button"
          onClick={() => addBlock('exercise')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ✏️ تمرين
        </button>
      </div>

      {/* Blocks List */}
      {contentBlocks.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #d1d5db',
          color: '#6b7280',
        }}>
          <p style={{ margin: 0, fontSize: '16px' }}>لا توجد عناصر بعد. اضغط على الأزرار أعلاه لإضافة عناصر.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={contentBlocks.map(block => block.id)}
            strategy={verticalListSortingStrategy}
          >
            {contentBlocks.map((block) => (
              <SortableBlockItem
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
                renderEditor={renderBlockEditor}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
