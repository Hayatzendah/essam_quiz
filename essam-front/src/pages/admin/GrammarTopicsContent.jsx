import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrammarTopics, getGrammarTopic, updateGrammarTopic, reorderGrammarTopics, deleteGrammarTopic } from '../../services/api';
import { PageBuilder } from '../../components/PageBuilder';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { useLevels } from '../../hooks/useLevels';
import './GrammarTopicsContent.css';

// Sortable Topic Card Component
const SortableTopicCard = ({ topic, onMoveUp, onMoveDown, onDelete, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const arrowButtonStyle = {
    padding: '6px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const disabledArrowStyle = {
    ...arrowButtonStyle,
    opacity: 0.3,
    cursor: 'not-allowed',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-topic-card"
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: isDragging ? '#e0f2fe' : '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        userSelect: 'none',
      }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            touchAction: 'none',
            padding: '4px',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Topic Info */}
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
            {topic.title}
          </span>
          {topic.shortDescription && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              {topic.shortDescription}
            </p>
          )}
        </div>

        {/* Level Badge */}
        <span style={{
          padding: '4px 8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
        }}>
          {topic.level}
        </span>

        {/* Arrow Buttons + Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              style={isFirst ? disabledArrowStyle : arrowButtonStyle}
              title="تحريك لأعلى"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              style={isLast ? disabledArrowStyle : arrowButtonStyle}
              title="تحريك لأسفل"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(topic._id); }}
              title="حذف الموضوع"
              style={{
                ...arrowButtonStyle,
                color: '#dc2626',
                borderColor: '#fca5a5',
                backgroundColor: '#fef2f2',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function GrammarTopicsContent() {
  const { levelNames: apiLevels } = useLevels();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loadingTopic, setLoadingTopic] = useState(false);

  const [contentBlocks, setContentBlocks] = useState([]);

  // Reorder mode state
  const [viewMode, setViewMode] = useState('content'); // 'content' or 'reorder'
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [reorderLoading, setReorderLoading] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState(null);

  // DnD sensors - with touch support for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold before drag starts on touch
        tolerance: 5, // 5px movement allowed during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get topics filtered by selected level
  const filteredTopics = topics.filter(t => t.level === selectedLevel);

  // Merge API levels with topic-derived levels for tab completeness
  const levels = [...new Set([...apiLevels, ...topics.map(t => t.level)])];

  // Load all topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoadingTopics(true);
        const data = await getGrammarTopics(); // بدون level لجلب كل المواضيع
        const topicsList = Array.isArray(data) ? data : (data?.items || data?.topics || []);
        setTopics(topicsList);
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError('حدث خطأ أثناء تحميل المواضيع');
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopics();
  }, []);

  // Load topic data when selected
  useEffect(() => {
    if (selectedTopicId) {
      const loadTopic = async () => {
        try {
          setLoadingTopic(true);
          setError('');
          // Find the selected topic to get its slug and level
          const selectedTopicData = topics.find(t => t._id === selectedTopicId);
          if (!selectedTopicData) {
            setError('الموضوع المحدد غير موجود');
            return;
          }
          
          // Use getGrammarTopic with slug and level
          const topic = await getGrammarTopic(selectedTopicData.slug, selectedTopicData.level);
          setSelectedTopic(topic);

          // Load contentBlocks from topic and normalize types
          if (topic.contentBlocks && Array.isArray(topic.contentBlocks) && topic.contentBlocks.length > 0) {
            // Normalize blocks (convert paragraph to intro) when loading from API
            const normalizedBlocks = topic.contentBlocks.map(block => ({
              ...block,
              type: block.type === 'paragraph' ? 'intro' : block.type,
            }));
            setContentBlocks(normalizedBlocks);
          } else {
            // Initialize with empty blocks if no contentBlocks exist
            setContentBlocks([]);
          }
        } catch (err) {
          console.error('Error loading topic:', err);
          setError('حدث خطأ أثناء تحميل بيانات الموضوع');
        } finally {
          setLoadingTopic(false);
        }
      };
      loadTopic();
    } else {
      setSelectedTopic(null);
      setContentBlocks([]);
    }
  }, [selectedTopicId]);

  // Handle content blocks change
  const handleContentBlocksChange = (blocks) => {
    setContentBlocks(blocks);
  };

  // Handle drag end for reordering topics
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTopics.findIndex(t => t._id === active.id);
      const newIndex = filteredTopics.findIndex(t => t._id === over.id);

      // Reorder locally first for immediate feedback
      const reorderedFiltered = arrayMove(filteredTopics, oldIndex, newIndex);

      // Update the main topics array with the new order
      const otherTopics = topics.filter(t => t.level !== selectedLevel);
      const newTopics = [...otherTopics, ...reorderedFiltered];
      setTopics(newTopics);

      // Save to backend
      try {
        setReorderLoading(true);
        const topicIds = reorderedFiltered.map(t => t._id);
        await reorderGrammarTopics(topicIds);
        setSuccess('تم حفظ الترتيب الجديد بنجاح!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error reordering topics:', err);
        setError('حدث خطأ أثناء حفظ الترتيب');
        // Reload topics to restore original order
        const data = await getGrammarTopics();
        const topicsList = Array.isArray(data) ? data : (data?.items || data?.topics || []);
        setTopics(topicsList);
      } finally {
        setReorderLoading(false);
      }
    }
  };

  // Handle delete topic
  const handleDeleteTopic = async (topicId) => {
    const topic = topics.find(t => t._id === topicId);
    if (!topic) return;
    if (!window.confirm(`هل أنت متأكد من حذف موضوع "${topic.title}"؟ لا يمكن التراجع.`)) return;

    setDeletingTopicId(topicId);
    setError('');
    try {
      await deleteGrammarTopic(topicId);
      setTopics(prev => prev.filter(t => t._id !== topicId));
      if (selectedTopicId === topicId) {
        setSelectedTopicId('');
        setSelectedTopic(null);
        setContentBlocks([]);
      }
      setSuccess('تم حذف الموضوع بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting topic:', err);
      setError(err?.response?.data?.message || 'حدث خطأ أثناء حذف الموضوع');
    } finally {
      setDeletingTopicId(null);
    }
  };

  // Handle manual move (up/down buttons for mobile)
  const handleManualMove = async (topicId, direction) => {
    const currentIndex = filteredTopics.findIndex(t => t._id === topicId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= filteredTopics.length) return;

    // Reorder locally first
    const reorderedFiltered = arrayMove(filteredTopics, currentIndex, newIndex);

    // Update the main topics array
    const otherTopics = topics.filter(t => t.level !== selectedLevel);
    const newTopics = [...otherTopics, ...reorderedFiltered];
    setTopics(newTopics);

    // Save to backend
    try {
      setReorderLoading(true);
      const topicIds = reorderedFiltered.map(t => t._id);
      await reorderGrammarTopics(topicIds);
      setSuccess('تم حفظ الترتيب!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error reordering topics:', err);
      setError('حدث خطأ أثناء حفظ الترتيب');
      // Reload topics to restore original order
      const data = await getGrammarTopics();
      const topicsList = Array.isArray(data) ? data : (data?.items || data?.topics || []);
      setTopics(topicsList);
    } finally {
      setReorderLoading(false);
    }
  };

  // Auto-save when a block is deleted
  const handleBlockDelete = async (blocks) => {
    if (!selectedTopicId) return;

    try {
      const normalizedBlocks = normalizeBlocks(blocks);
      const updateData = {
        contentBlocks: normalizedBlocks || [],
      };
      await updateGrammarTopic(selectedTopicId, updateData);
      setSuccess('تم حذف العنصر وحفظ التغييرات بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error auto-saving after delete:', err);
      setError('تم الحذف محلياً لكن فشل الحفظ. اضغط على زر الحفظ يدوياً.');
    }
  };

  // Normalize block type (convert paragraph to intro)
  const normalizeType = (type) => {
    if (type === 'paragraph') return 'intro';
    return type;
  };

  // Normalize blocks array before sending to API
  const normalizeBlocks = (blocks) => {
    return (blocks || []).map(block => ({
      ...block,
      type: normalizeType(block.type),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setError('يجب اختيار موضوع أولاً');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Normalize blocks before sending to API
      const normalizedBlocks = normalizeBlocks(contentBlocks);
      const updateData = {
        contentBlocks: normalizedBlocks || [],
      };

      await updateGrammarTopic(selectedTopicId, updateData);
      setSuccess('تم حفظ المحتوى بنجاح!');
      
      // Reload topic to get updated data
      const selectedTopicData = topics.find(t => t._id === selectedTopicId);
      if (selectedTopicData) {
        const updatedTopic = await getGrammarTopic(selectedTopicData.slug, selectedTopicData.level);
        setSelectedTopic(updatedTopic);
        if (updatedTopic.contentBlocks && Array.isArray(updatedTopic.contentBlocks)) {
          setContentBlocks(updatedTopic.contentBlocks);
        }
      }
    } catch (err) {
      console.error('Error saving topic:', err);
      setError(err?.response?.data?.message || 'حدث خطأ أثناء حفظ المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const formStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    direction: 'ltr',
    textAlign: 'left',
  };

  const sectionStyle = {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'Tajawal, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
  };

  return (
    <div style={formStyle}>
      {/* Header with back button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        padding: '20px 28px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E9ECEF'
      }}>
        <button 
          onClick={() => navigate('/welcome')} 
          title="العودة للوحة التحكم"
          style={{ 
            background: 'white', 
            border: '1px solid #DEE2E6', 
            padding: '10px', 
            borderRadius: '8px', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.borderColor = '#212529';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#DEE2E6';
          }}
        >
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              stroke="#000000" 
              fill="none"
            />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', fontFamily: 'Tajawal, sans-serif' }}>
          مواضيع القواعد (شرح)
        </h1>
      </div>

      {/* View Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        padding: '8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        width: 'fit-content',
      }}>
        <button
          type="button"
          onClick={() => setViewMode('content')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'content' ? '#000' : 'transparent',
            color: viewMode === 'content' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
        >
          تعديل المحتوى
        </button>
        <button
          type="button"
          onClick={() => setViewMode('reorder')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'reorder' ? '#000' : 'transparent',
            color: viewMode === 'reorder' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
        >
          ترتيب المواضيع
        </button>
      </div>

      {/* Reorder Mode */}
      {viewMode === 'reorder' && (
        <div style={sectionStyle}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            ترتيب المواضيع بالسحب والإفلات
          </h2>

          {/* Level Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>اختر المستوى:</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {levels.length > 0 ? levels.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedLevel === level ? '#3b82f6' : '#fff',
                    color: selectedLevel === level ? '#fff' : '#374151',
                    border: '1px solid',
                    borderColor: selectedLevel === level ? '#3b82f6' : '#d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {level}
                </button>
              )) : (
                <span style={{ color: '#6b7280' }}>لا توجد مستويات</span>
              )}
            </div>
          </div>

          {/* Loading indicator */}
          {reorderLoading && (
            <div style={{
              padding: '12px',
              backgroundColor: '#e0f2fe',
              borderRadius: '6px',
              marginBottom: '16px',
              textAlign: 'center',
              color: '#0369a1',
            }}>
              جاري حفظ الترتيب...
            </div>
          )}

          {/* Topics List */}
          {loadingTopics ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>جاري تحميل المواضيع...</p>
          ) : filteredTopics.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
              لا توجد مواضيع لهذا المستوى
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTopics.map(t => t._id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredTopics.map((topic, index) => (
                    <div key={topic._id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        flexShrink: 0,
                      }}>
                        {index + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <SortableTopicCard
                          topic={topic}
                          onMoveUp={() => handleManualMove(topic._id, 'up')}
                          onMoveDown={() => handleManualMove(topic._id, 'down')}
                          onDelete={deletingTopicId ? null : handleDeleteTopic}
                          isFirst={index === 0}
                          isLast={index === filteredTopics.length - 1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
            اسحب البطاقات أو استخدم الأسهم لترتيبها. يتم حفظ الترتيب تلقائياً.
          </p>
        </div>
      )}

      {/* Content Mode */}
      {viewMode === 'content' && (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Topic Selection */}
        <div style={sectionStyle}>
          <label htmlFor="topicSelect" style={labelStyle}>
            اختر الموضوع / Select Topic *
          </label>
          {loadingTopics ? (
            <p style={{ color: '#6b7280' }}>جاري تحميل المواضيع...</p>
          ) : (
            <select
              id="topicSelect"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">-- اختر الموضوع --</option>
              {topics.map((topic) => (
                <option key={topic._id} value={topic._id}>
                  {topic.title} ({topic.level})
                </option>
              ))}
            </select>
          )}
          {selectedTopic && (
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, padding: '12px', backgroundColor: '#e0f2fe', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                  <strong>المستوى:</strong> {selectedTopic.level} | 
                  <strong> الوصف:</strong> {selectedTopic.shortDescription || 'لا يوجد وصف'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteTopic(selectedTopicId)}
                disabled={!!deletingTopicId}
                style={{
                  padding: '8px 14px',
                  backgroundColor: deletingTopicId ? '#fecaca' : '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  cursor: deletingTopicId ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {deletingTopicId === selectedTopicId ? 'جاري الحذف...' : 'حذف هذا الموضوع'}
              </button>
            </div>
          )}
        </div>

        {/* Page Builder */}
        {selectedTopicId && (
          <>
            {loadingTopic ? (
              <div style={sectionStyle}>
                <p style={{ textAlign: 'center', color: '#6b7280' }}>جاري تحميل بيانات الموضوع...</p>
              </div>
            ) : (
                <div style={sectionStyle}>
                <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                  بناء المحتوى / Content Builder
                </h2>
                <PageBuilder
                  blocks={contentBlocks}
                  onChange={handleContentBlocksChange}
                    />
                  </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '6px',
              border: '1px solid #fcc',
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#efe',
              color: '#3c3',
              borderRadius: '6px',
              border: '1px solid #cfc',
            }}
          >
            {success}
          </div>
        )}

        {/* Submit Button */}
        {selectedTopicId && !loadingTopic && (
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#000000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#333333';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#000000';
              }
            }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الموضوع'}
          </button>
        )}
      </form>
      )}

      {/* Error Message (shown in both modes) */}
      {error && viewMode === 'reorder' && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '6px',
            border: '1px solid #fcc',
            marginTop: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Success Message (shown in both modes) */}
      {success && viewMode === 'reorder' && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '6px',
            border: '1px solid #cfc',
            marginTop: '16px',
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}

export default GrammarTopicsContent;

