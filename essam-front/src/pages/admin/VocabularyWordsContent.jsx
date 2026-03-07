import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getVocabularyTopic,
  getVocabularyWords,
  createVocabularyWord,
  createVocabularyWordsBulk,
  updateVocabularyWord,
  deleteVocabularyWord,
  reorderVocabularyWords,
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
import './VocabularyWordsContent.css';

// Build display text for a word
const getWordDisplayText = (word) => {
  const germanWord = word.word || word.germanWord || '';
  const parts = [];
  if (germanWord) parts.push(germanWord);

  const meaningParts = [];
  if (word.meanings && Array.isArray(word.meanings) && word.meanings.length > 0) {
    word.meanings.forEach((m) => {
      const text = m.text || m;
      if (text && text.trim()) meaningParts.push(text.trim());
    });
  }
  if (meaningParts.length === 0 && word.meaning) {
    const s = String(word.meaning);
    if (s.includes('/')) meaningParts.push(...s.split(/\s*\/\s*/).filter(Boolean));
    else if (s.includes('|')) meaningParts.push(...s.split(/\s*\|\s*/).filter(Boolean));
    else if (s.trim()) meaningParts.push(s.trim());
  }
  if (meaningParts.length > 0) parts.push(meaningParts.join(' | '));
  if (word.exampleSentence) parts.push(word.exampleSentence);
  return parts.join(' - ');
};

// Sortable Word Row Component
const SortableWordRow = ({ word, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: word._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const arrowBtn = {
    padding: '4px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const disabledBtn = { ...arrowBtn, opacity: 0.3, cursor: 'not-allowed' };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        backgroundColor: isDragging ? '#e0f2fe' : '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        userSelect: 'none',
      }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none', padding: '4px' }}>
          <svg width="18" height="18" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        <div style={{ flex: 1, fontSize: '14px', color: '#1f2937', direction: 'ltr', textAlign: 'left' }}>
          {getWordDisplayText(word)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button type="button" onClick={onMoveUp} disabled={isFirst} style={isFirst ? disabledBtn : arrowBtn} title="أعلى">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} style={isLast ? disabledBtn : arrowBtn} title="أسفل">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

function VocabularyWordsContent() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(true);
  const [loadingWords, setLoadingWords] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [topic, setTopic] = useState(null);
  const [words, setWords] = useState([]);
  const [editingWordId, setEditingWordId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [viewMode, setViewMode] = useState('words'); // 'words' or 'reorder'
  const [reorderLoading, setReorderLoading] = useState(false);

  const [formData, setFormData] = useState({
    germanWord: '',
    meaning: '',
    exampleSentence: '',
    status: 'active',
  });

  const [bulkData, setBulkData] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (topicId) {
      loadTopic();
      loadWords();
    }
  }, [topicId]);

  const loadTopic = async () => {
    try {
      setLoadingTopic(true);
      const data = await getVocabularyTopic(topicId);
      setTopic(data);
    } catch (err) {
      console.error('Error loading topic:', err);
      setError('حدث خطأ أثناء تحميل الموضوع');
    } finally {
      setLoadingTopic(false);
    }
  };

  const loadWords = async () => {
    try {
      setLoadingWords(true);
      const data = await getVocabularyWords(topicId);
      const wordsList = Array.isArray(data) ? data : [];
      const sortedWords = [...wordsList].sort((a, b) => {
        if (a.order !== undefined && a.order !== null && b.order !== undefined && b.order !== null) return a.order - b.order;
        if (a.order !== undefined && a.order !== null) return -1;
        if (b.order !== undefined && b.order !== null) return 1;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
      setWords(sortedWords);
    } catch (err) {
      console.error('Error loading words:', err);
      setError('حدث خطأ أثناء تحميل الكلمات');
    } finally {
      setLoadingWords(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBulkDataChange = (e) => {
    setBulkData(e.target.value);
  };

  const parseBulkData = () => {
    const lines = bulkData.split('\n').filter(line => line.trim());
    return lines.map((rawLine, index) => {
      const line = rawLine.trim();
      const dashRegex = /[-–]/;
      const firstDashMatch = line.match(dashRegex);
      const firstDashIndex = firstDashMatch ? firstDashMatch.index : -1;

      if (firstDashIndex !== -1) {
        const germanPart = line.slice(0, firstDashIndex).trim();
        const rest = line.slice(firstDashIndex + 1).trim();
        if (!germanPart) return null;

        const secondDashMatch = rest.match(dashRegex);
        const secondDashIndex = secondDashMatch ? secondDashMatch.index : -1;

        let translationsPart = rest;
        let exampleSentence = '';
        if (secondDashIndex !== -1) {
          translationsPart = rest.slice(0, secondDashIndex).trim();
          exampleSentence = rest.slice(secondDashIndex + 1).trim();
        }

        const translations = translationsPart.split('|').map(t => t.trim()).filter(Boolean);
        return { word: germanPart, meaning: translations.join(' / '), exampleSentence, order: index };
      }

      const oldParts = line.split('|').map(p => p.trim());
      if (!oldParts[0] || !oldParts[1]) return null;
      return { word: oldParts[0], meaning: oldParts[1], exampleSentence: oldParts[2] || '', order: index };
    }).filter(w => w && w.word && w.meaning);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (bulkMode) {
        const wordsToAdd = parseBulkData();
        if (wordsToAdd.length === 0) {
          setError('يرجى إدخال كلمات بصيغة صحيحة');
          return;
        }
        await createVocabularyWordsBulk(topicId, wordsToAdd);
        setSuccess(`تم إضافة ${wordsToAdd.length} كلمة بنجاح!`);
        setBulkData('');
      } else {
        if (!formData.germanWord.trim() || !formData.meaning.trim()) {
          setError('الكلمة والمعنى مطلوبان');
          return;
        }

        const meaningForBackend = formData.meaning.split('|').map(m => m.trim()).filter(Boolean).join(' / ');
        const payload = {
          word: formData.germanWord.trim(),
          meaning: meaningForBackend,
          exampleSentence: formData.exampleSentence || undefined,
        };

        if (editingWordId) {
          await updateVocabularyWord(topicId, editingWordId, payload);
          setSuccess('تم تحديث الكلمة بنجاح!');
        } else {
          await createVocabularyWord(topicId, payload);
          setSuccess('تم إضافة الكلمة بنجاح!');
        }

        setFormData({ germanWord: '', meaning: '', exampleSentence: '', status: 'active' });
        setEditingWordId(null);
      }

      await loadWords();
    } catch (err) {
      console.error('Error saving word:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ الكلمة');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (word) => {
    let meaningText = '';
    if (word.meanings && Array.isArray(word.meanings)) {
      meaningText = word.meanings.map(m => m.text || m).join(' | ');
    } else if (word.meaning) {
      meaningText = word.meaning.replace(/\s*\/\s*/g, ' | ');
    }

    setFormData({
      germanWord: word.word || word.germanWord || '',
      meaning: meaningText,
      exampleSentence: word.exampleSentence || '',
      status: word.status || 'active',
    });
    setEditingWordId(word._id || word.id);
    setBulkMode(false);
    setViewMode('words');
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (wordId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الكلمة؟')) return;

    try {
      await deleteVocabularyWord(topicId, wordId);
      setSuccess('تم حذف الكلمة بنجاح!');
      await loadWords();
    } catch (err) {
      console.error('Error deleting word:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء حذف الكلمة');
    }
  };

  // Drag and drop handlers
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = words.findIndex(w => w._id === active.id);
      const newIndex = words.findIndex(w => w._id === over.id);
      const reordered = arrayMove(words, oldIndex, newIndex);
      setWords(reordered);

      try {
        setReorderLoading(true);
        await reorderVocabularyWords(reordered.map(w => w._id));
        setSuccess('تم حفظ الترتيب!');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) {
        console.error('Error reordering:', err);
        setError('حدث خطأ أثناء حفظ الترتيب');
        await loadWords();
      } finally {
        setReorderLoading(false);
      }
    }
  };

  const handleManualMove = async (wordId, direction) => {
    const currentIndex = words.findIndex(w => w._id === wordId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= words.length) return;

    const reordered = arrayMove(words, currentIndex, newIndex);
    setWords(reordered);

    try {
      setReorderLoading(true);
      await reorderVocabularyWords(reordered.map(w => w._id));
      setSuccess('تم حفظ الترتيب!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error reordering:', err);
      setError('حدث خطأ أثناء حفظ الترتيب');
      await loadWords();
    } finally {
      setReorderLoading(false);
    }
  };

  if (loadingTopic) {
    return <div className="vocabulary-words-content">جاري التحميل...</div>;
  }

  if (!topic) {
    return <div className="vocabulary-words-content">الموضوع غير موجود</div>;
  }

  return (
    <div className="vocabulary-words-content">
      <div className="content-header">
        <button onClick={() => navigate('/admin/vocabulary/topics')} className="back-button">
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
              d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke="#000000" fill="none" />
          </svg>
        </button>
        <div>
          <h1>إدارة الكلمات</h1>
          <p className="topic-info">
            {topic.icon && <span className="topic-icon">{topic.icon}</span>}
            <span className="topic-title">{topic.title}</span>
            <span className="topic-level">({topic.level})</span>
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px', padding: '8px',
        backgroundColor: '#f3f4f6', borderRadius: '8px', width: 'fit-content',
      }}>
        <button type="button" onClick={() => setViewMode('words')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'words' ? '#000' : 'transparent',
            color: viewMode === 'words' ? '#fff' : '#374151',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease',
          }}>
          إدارة الكلمات
        </button>
        <button type="button" onClick={() => setViewMode('reorder')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'reorder' ? '#000' : 'transparent',
            color: viewMode === 'reorder' ? '#fff' : '#374151',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease',
          }}>
          ترتيب الكلمات
        </button>
      </div>

      {/* Reorder Mode */}
      {viewMode === 'reorder' && (
        <div style={{
          backgroundColor: '#fff', border: '1px solid #e5e7eb',
          borderRadius: '12px', padding: '24px', marginBottom: '24px',
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            ترتيب الكلمات بالسحب والإفلات ({words.length} كلمة)
          </h2>

          {reorderLoading && (
            <div style={{
              padding: '12px', backgroundColor: '#e0f2fe', borderRadius: '6px',
              marginBottom: '16px', textAlign: 'center', color: '#0369a1',
            }}>
              جاري حفظ الترتيب...
            </div>
          )}

          {loadingWords ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>جاري تحميل الكلمات...</p>
          ) : words.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>لا توجد كلمات</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={words.map(w => w._id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {words.map((word, index) => (
                    <div key={word._id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '28px', height: '28px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#e5e7eb', borderRadius: '50%',
                        fontSize: '11px', fontWeight: '600', color: '#374151', flexShrink: 0,
                      }}>
                        {index + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <SortableWordRow
                          word={word}
                          onMoveUp={() => handleManualMove(word._id, 'up')}
                          onMoveDown={() => handleManualMove(word._id, 'down')}
                          isFirst={index === 0}
                          isLast={index === words.length - 1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
            اسحب الكلمات أو استخدم الأسهم لترتيبها. يتم حفظ الترتيب تلقائياً.
          </p>

          {error && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', color: '#166534' }}>
              {success}
            </div>
          )}
        </div>
      )}

      {/* Words Mode (Form + Table) */}
      {viewMode === 'words' && (
        <>
          {/* Form */}
          <form onSubmit={handleSubmit} className="vocabulary-word-form">
            <div className="form-header">
              <h2>{editingWordId ? 'تعديل كلمة' : bulkMode ? 'إضافة عدة كلمات' : 'إضافة كلمة'}</h2>
              <div className="mode-toggle">
                <button type="button"
                  onClick={() => { setBulkMode(false); setFormData({ germanWord: '', meaning: '', exampleSentence: '', status: 'active' }); setEditingWordId(null); setBulkData(''); }}
                  className={!bulkMode ? 'active' : ''}>
                  كلمة واحدة
                </button>
                <button type="button"
                  onClick={() => { setBulkMode(true); setFormData({ germanWord: '', meaning: '', exampleSentence: '', status: 'active' }); setEditingWordId(null); }}
                  className={bulkMode ? 'active' : ''}>
                  عدة كلمات (10-20)
                </button>
              </div>
            </div>

            {bulkMode ? (
              <div className="form-group">
                <label htmlFor="bulkData">إدخال عدة كلمات</label>
                <textarea
                  id="bulkData" name="bulkData" value={bulkData} onChange={handleBulkDataChange}
                  placeholder={`die Schule / die Schulen - school | école | مدرسة - Ich gehe in die Schule.
die Klasse / die Klassen - class | classe | صف - Meine Klasse ist groß.
der Lehrer / die Lehrer - teacher | professeur | معلم - Der Lehrer erklärt die Aufgabe.`}
                  rows="15"
                />
                <small>
                  الصيغة: الكلمة بالألماني (مع الـ Plural إذا وجد) - ترجمة1 | ترجمة2 | ترجمة3 - جملة مثال (اختياري)<br/>
                  كل سطر = كلمة واحدة
                </small>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="germanWord">الكلمة بالألماني *</label>
                  <input type="text" id="germanWord" name="germanWord" value={formData.germanWord}
                    onChange={handleInputChange} placeholder="Beispiel: Haus" required />
                </div>
                <div className="form-group">
                  <label htmlFor="meaning">المعنى *</label>
                  <input type="text" id="meaning" name="meaning" value={formData.meaning}
                    onChange={handleInputChange} placeholder="teacher | professeur | معلم" required />
                  <small style={{ display: 'block', marginTop: '4px', color: '#6b7280', fontSize: '12px' }}>
                    يمكنك إضافة عدة ترجمات مفصولة بـ | (مثال: teacher | professeur | معلم)
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="exampleSentence">جملة مثال (اختياري)</label>
                  <input type="text" id="exampleSentence" name="exampleSentence" value={formData.exampleSentence}
                    onChange={handleInputChange} placeholder="Ich wohne in einem großen Haus." />
                </div>
                <div className="form-group">
                  <label htmlFor="status">حالة الكلمة *</label>
                  <select id="status" name="status" value={formData.status} onChange={handleInputChange} required>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              {editingWordId && (
                <button type="button"
                  onClick={() => { setFormData({ germanWord: '', meaning: '', exampleSentence: '', status: 'active' }); setEditingWordId(null); setBulkMode(false); setError(''); setSuccess(''); }}
                  className="cancel-btn">
                  إلغاء التعديل
                </button>
              )}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'جاري الحفظ...' : editingWordId ? 'تحديث الكلمة' : bulkMode ? '➕ إضافة الكلمات' : '➕ إضافة كلمة'}
              </button>
            </div>
          </form>

          {/* Words Table */}
          <div className="words-table-section">
            <h2>الكلمات ({words.length})</h2>

            {loadingWords ? (
              <p>جاري تحميل الكلمات...</p>
            ) : words.length === 0 ? (
              <p className="no-data">لا توجد كلمات بعد</p>
            ) : (
              <div className="words-table-container">
                <table className="words-table">
                  <thead>
                    <tr>
                      <th>الكلمة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((word) => (
                      <tr key={word._id || word.id}>
                        <td className="german-word" dir="ltr" style={{ padding: '12px' }}>
                          {getWordDisplayText(word) || 'لا توجد بيانات'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => handleEdit(word)} className="action-btn edit-btn" title="تعديل">✏️</button>
                            <button onClick={() => handleDelete(word._id || word.id)} className="action-btn delete-btn" title="حذف">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default VocabularyWordsContent;
