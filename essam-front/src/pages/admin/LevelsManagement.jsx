import { useState, useEffect, useCallback } from 'react';
import { levelsAPI } from '../../services/levelsAPI';
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

const FALLBACK_SECTION_OPTIONS = [
  { key: 'grammatik', label: 'Grammatik' },
  { key: 'wortschatz', label: 'Wortschatz' },
  { key: 'pruefungen', label: 'Prüfungen' },
  { key: 'leben_in_deutschland', label: 'Leben in Deutschland' },
  { key: 'derdiedas', label: 'Der / Die / Das' },
  { key: 'lesen_hoeren', label: 'Lesen & Hören' },
  { key: 'dialoge', label: 'Dialoge' },
  { key: 'grammatik_training', label: 'Grammatik-Training' },
];

// Sortable Level Row
const SortableLevelRow = ({ level, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: level._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white rounded-lg border ${isDragging ? 'border-blue-400 shadow-lg' : 'border-slate-200'} mb-2`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600"
        title="اسحب لإعادة الترتيب"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-lg font-bold text-slate-800">{level.name}</span>
        {level.label && (
          <span className="text-sm text-slate-500">{level.label}</span>
        )}
        {level.isDefault && (
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
            افتراضي
          </span>
        )}
        {!level.isActive && (
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full font-medium">
            غير نشط
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(level)}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="تعديل"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {!level.isDefault && (
          <button
            onClick={() => onDelete(level)}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

function LevelsManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dynamic sections from backend
  const [sectionOptions, setSectionOptions] = useState([]);
  const allSectionKeys = sectionOptions.map((s) => s.key);

  // Add form
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSections, setNewSections] = useState([]);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingLevel, setEditingLevel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editSections, setEditSections] = useState([]);

  // Delete confirmation
  const [deletingLevel, setDeletingLevel] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchLevels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await levelsAPI.getAllAdmin();
      setLevels(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('فشل تحميل المستويات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    levelsAPI.getSections()
      .then((data) => {
        const sections = Array.isArray(data) ? data : FALLBACK_SECTION_OPTIONS;
        setSectionOptions(sections);
        setNewSections(sections.map((s) => s.key));
      })
      .catch(() => {
        setSectionOptions(FALLBACK_SECTION_OPTIONS);
        setNewSections(FALLBACK_SECTION_OPTIONS.map((s) => s.key));
      });
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      await levelsAPI.create({ name: newName.trim(), label: newLabel.trim() || undefined, sections: newSections });
      setNewName('');
      setNewLabel('');
      setNewSections([...allSectionKeys]);
      setSuccess('تم إضافة المستوى بنجاح');
      fetchLevels();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إضافة المستوى');
    } finally {
      setAdding(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = levels.findIndex((l) => l._id === active.id);
    const newIndex = levels.findIndex((l) => l._id === over.id);
    const newLevels = arrayMove(levels, oldIndex, newIndex);
    setLevels(newLevels);

    try {
      await levelsAPI.reorder(newLevels.map((l) => l._id));
    } catch (err) {
      setError('فشل إعادة الترتيب');
      fetchLevels();
    }
  };

  const handleEditStart = (level) => {
    setEditingLevel(level);
    setEditName(level.name);
    setEditLabel(level.label || '');
    setEditActive(level.isActive);
    setEditSections(level.sections || [...allSectionKeys]);
  };

  const handleEditSave = async () => {
    if (!editingLevel) return;
    setError('');
    setSuccess('');
    try {
      const updates = {};
      if (editName !== editingLevel.name) updates.name = editName;
      if (editLabel !== (editingLevel.label || '')) updates.label = editLabel || undefined;
      if (editActive !== editingLevel.isActive) updates.isActive = editActive;
      const origSections = editingLevel.sections || allSectionKeys;
      if (JSON.stringify([...editSections].sort()) !== JSON.stringify([...origSections].sort())) {
        updates.sections = editSections;
      }
      if (Object.keys(updates).length === 0) {
        setEditingLevel(null);
        return;
      }
      await levelsAPI.update(editingLevel._id, updates);
      setEditingLevel(null);
      setSuccess('تم تحديث المستوى');
      fetchLevels();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التحديث');
    }
  };

  const handleDeleteStart = async (level) => {
    setDeletingLevel(level);
    setReassignTo('');
    setLoadingCount(true);
    try {
      const data = await levelsAPI.getItemCount(level._id);
      setItemCount(data.count || 0);
    } catch {
      setItemCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLevel || !reassignTo) return;
    setError('');
    setSuccess('');
    try {
      await levelsAPI.delete(deletingLevel._id, reassignTo);
      setDeletingLevel(null);
      setSuccess('تم حذف المستوى ونقل العناصر بنجاح');
      fetchLevels();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            إدارة المستويات
          </h1>
          <p className="text-slate-500 text-sm">
            إضافة وتعديل وترتيب المستويات الدراسية. المستويات الافتراضية (A1-C1) محمية من الحذف.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">إضافة مستوى جديد</h3>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <input
              type="text"
              placeholder="اسم المستوى (مثل: C2)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="عنوان العرض (اختياري)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">الأقسام</label>
            <div className="flex flex-wrap gap-3">
              {sectionOptions.map((opt) => (
                <label key={opt.key} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newSections.includes(opt.key)}
                    onChange={(e) => {
                      setNewSections((prev) =>
                        e.target.checked
                          ? [...prev, opt.key]
                          : prev.filter((s) => s !== opt.key)
                      );
                    }}
                    className="rounded border-slate-300"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {newSections.length === 0 && (
              <p className="text-xs text-red-500 mt-1">يجب اختيار قسم واحد على الأقل</p>
            )}
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim() || newSections.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {adding ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </form>

        {/* Levels List with DnD */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={levels.map((l) => l._id)} strategy={verticalListSortingStrategy}>
            {levels.map((level) => (
              <SortableLevelRow
                key={level._id}
                level={level}
                onEdit={handleEditStart}
                onDelete={handleDeleteStart}
              />
            ))}
          </SortableContext>
        </DndContext>

        {levels.length === 0 && (
          <div className="text-center text-slate-400 py-12">لا توجد مستويات</div>
        )}

        {/* Edit Modal */}
        {editingLevel && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                تعديل المستوى: {editingLevel.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={editingLevel.isDefault}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                  {editingLevel.isDefault && (
                    <p className="text-xs text-slate-400 mt-1">لا يمكن تغيير اسم المستوى الافتراضي</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">عنوان العرض</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اختياري"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">الأقسام</label>
                  <div className="flex flex-wrap gap-3">
                    {sectionOptions.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={editSections.includes(opt.key)}
                          onChange={(e) => {
                            setEditSections((prev) =>
                              e.target.checked
                                ? [...prev, opt.key]
                                : prev.filter((s) => s !== opt.key)
                            );
                          }}
                          className="rounded border-slate-300"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {editSections.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">يجب اختيار قسم واحد على الأقل</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editActive"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="editActive" className="text-sm text-slate-700">نشط</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => setEditingLevel(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSections.length === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingLevel && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-red-700 mb-2">
                حذف المستوى: {deletingLevel.name}
              </h3>
              {loadingCount ? (
                <p className="text-sm text-slate-500">جاري التحقق...</p>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    {itemCount > 0
                      ? `يوجد ${itemCount} عنصر مرتبط بهذا المستوى. يجب اختيار مستوى بديل لنقل العناصر إليه.`
                      : 'لا توجد عناصر مرتبطة بهذا المستوى. يجب اختيار مستوى بديل على أي حال.'}
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      نقل العناصر إلى:
                    </label>
                    <select
                      value={reassignTo}
                      onChange={(e) => setReassignTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر المستوى البديل</option>
                      {levels
                        .filter((l) => l._id !== deletingLevel._id)
                        .map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.name} {l.label ? `(${l.label})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingLevel(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={!reassignTo || loadingCount}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  حذف ونقل العناصر
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LevelsManagement;
