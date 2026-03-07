import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSchreibenTasks,
  deleteSchreibenTask,
  reorderSchreibenTasks
} from '../../services/api';
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

// Provider labels mapping
const providerLabels = {
  goethe: 'Goethe',
  telc: 'TELC',
  oesd: 'ÖSD',
  ecl: 'ECL',
  dtb: 'DTB',
  dtz: 'DTZ',
};

// Sortable Task Card Component
const SortableTaskCard = ({ task, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors = {
    draft: { bg: '#fef3c7', text: '#92400e', label: 'مسودة' },
    published: { bg: '#d1fae5', text: '#065f46', label: 'منشور' },
    archived: { bg: '#e5e7eb', text: '#374151', label: 'مؤرشف' },
  };

  const statusStyle = statusColors[task.status] || statusColors.draft;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-200 rounded-lg p-4 mb-3"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            touchAction: 'none',
            padding: '8px',
            color: '#9ca3af',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Task Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>
              {task.title}
            </span>
            <span style={{
              padding: '2px 8px',
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '500',
            }}>
              {statusStyle.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
            <span>المستوى: {task.level}</span>
            <span>المزود: {providerLabels[task.provider] || task.provider}</span>
          </div>
        </div>

        {/* Arrow Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              padding: '4px',
              backgroundColor: isFirst ? '#f3f4f6' : '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              opacity: isFirst ? 0.3 : 1,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              padding: '4px',
              backgroundColor: isLast ? '#f3f4f6' : '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: isLast ? 'not-allowed' : 'pointer',
              opacity: isLast ? 0.3 : 1,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
};

function SchreibenTasksManagement() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reorderLoading, setReorderLoading] = useState(false);

  // Filters
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { levelNames: levels } = useLevels();
  const providers = [
    { value: 'goethe', label: 'Goethe' },
    { value: 'telc', label: 'TELC' },
    { value: 'oesd', label: 'ÖSD' },
    { value: 'ecl', label: 'ECL' },
    { value: 'dtb', label: 'DTB' },
    { value: 'dtz', label: 'DTZ' },
  ];
  const statuses = [
    { value: 'draft', label: 'مسودة' },
    { value: 'published', label: 'منشور' },
    { value: 'archived', label: 'مؤرشف' },
  ];

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [selectedLevel, selectedProvider, selectedStatus]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedLevel) params.level = selectedLevel;
      if (selectedProvider) params.provider = selectedProvider;
      if (selectedStatus) params.status = selectedStatus;

      const data = await getSchreibenTasks(params);
      const tasksList = Array.isArray(data) ? data : (data?.tasks || data?.items || []);
      setTasks(tasksList);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('حدث خطأ أثناء تحميل المهام');
    } finally {
      setLoading(false);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t._id === active.id);
      const newIndex = tasks.findIndex(t => t._id === over.id);
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      setTasks(reordered);

      try {
        setReorderLoading(true);
        await reorderSchreibenTasks(reordered.map(t => t._id));
        setSuccess('تم حفظ الترتيب!');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) {
        console.error('Error reordering:', err);
        setError('حدث خطأ أثناء حفظ الترتيب');
        loadTasks();
      } finally {
        setReorderLoading(false);
      }
    }
  };

  // Handle manual move
  const handleManualMove = async (taskId, direction) => {
    const currentIndex = tasks.findIndex(t => t._id === taskId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;

    const reordered = arrayMove(tasks, currentIndex, newIndex);
    setTasks(reordered);

    try {
      setReorderLoading(true);
      await reorderSchreibenTasks(reordered.map(t => t._id));
      setSuccess('تم حفظ الترتيب!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error reordering:', err);
      setError('حدث خطأ أثناء حفظ الترتيب');
      loadTasks();
    } finally {
      setReorderLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (taskId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      await deleteSchreibenTask(taskId);
      setTasks(tasks.filter(t => t._id !== taskId));
      setSuccess('تم حذف المهمة بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('حدث خطأ أثناء حذف المهمة');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
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
          }}
        >
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke="#000" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          إدارة مهام الكتابة (Schreiben)
        </h1>
      </div>

      {/* Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">كل المستويات</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">كل المزودين</option>
            {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">كل الحالات</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Add Button */}
        <button
          onClick={() => navigate('/admin/schreiben/new')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>+</span>
          إضافة مهمة جديدة
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {success}
        </div>
      )}
      {reorderLoading && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e0f2fe',
          color: '#0369a1',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          جاري حفظ الترتيب...
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          جاري تحميل المهام...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #d1d5db',
        }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>لا توجد مهام حتى الآن</p>
          <button
            onClick={() => navigate('/admin/schreiben/new')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            إضافة أول مهمة
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map(t => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task, index) => (
              <SortableTaskCard
                key={task._id}
                task={task}
                onEdit={() => navigate(`/admin/schreiben/${task._id}`)}
                onDelete={() => handleDelete(task._id)}
                onMoveUp={() => handleManualMove(task._id, 'up')}
                onMoveDown={() => handleManualMove(task._id, 'down')}
                isFirst={index === 0}
                isLast={index === tasks.length - 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
        اسحب المهام أو استخدم الأسهم لترتيبها. يتم حفظ الترتيب تلقائياً.
      </p>
    </div>
  );
}

export default SchreibenTasksManagement;
