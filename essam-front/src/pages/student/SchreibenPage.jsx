import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { sanitizeHtml, normalizeWordHtml } from '../../utils/sanitizeHtml';
import { getSchreibenTasks, getSchreibenTask, checkSchreibenField } from '../../services/api';
import { useLevels } from '../../hooks/useLevels';
import './SchreibenPage.css';

// ألوان خلفية الفقرة (للتعليمات العامة - نفس المحرر)
const PARAGRAPH_BORDER_MAP = {
  '': '#e2e8f0',
  '#ffffff': '#d1d5db',
  '#fefce8': '#fde68a',
  '#f0fdf4': '#bbf7d0',
  '#eff6ff': '#bfdbfe',
  '#fef2f2': '#fecaca',
  '#faf5ff': '#e9d5ff',
  '#f5f5f5': '#d4d4d4',
};

// ألوان البطاقات (نفس مفاتيح المحرر)
const CARD_COLORS_MAP = {
  sky: { bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
  emerald: { bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
  violet: { bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
  rose: { bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  orange: { bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
  indigo: { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
  gray: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
};

// Provider labels mapping
const providerLabels = {
  goethe: 'Goethe',
  telc: 'TELC',
  oesd: 'ÖSD',
  ecl: 'ECL',
  dtb: 'DTB',
  dtz: 'DTZ',
};

// Inline result badge shown under a field after check/grading
const FieldResultBadge = ({ result }) => {
  if (!result) return null;
  // For submit results: skip non-student fields
  if (result.isStudentField === false) return null;
  // For submit results: skip unanswered
  if (result.wasAnswered === false) return null;

  if (result.isCorrect) {
    return (
      <div className="mt-2 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
        <span className="text-emerald-600 font-bold text-sm">✓</span>
        <span className="text-emerald-700 text-sm font-medium">صحيح</span>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-600 font-bold text-sm">✗</span>
        <span className="text-rose-700 text-sm font-medium">خطأ</span>
      </div>
      <div className="text-sm">
        <span className="text-slate-500">الإجابة الصحيحة: </span>
        <span className="text-emerald-700 font-semibold">
          {Array.isArray(result.correctAnswer)
            ? result.correctAnswer.join(', ')
            : result.correctAnswer}
        </span>
      </div>
    </div>
  );
};

// Task Detail View
const TaskDetailView = ({ task, taskId, onBack, hasQuestions, examAttemptId }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});

  // Per-field check results
  const [fieldChecks, setFieldChecks] = useState({}); // fieldId -> check result
  const [checkingField, setCheckingField] = useState(null); // fieldId currently being checked

  const handleFieldChange = (blockIndex, fieldIndex, value) => {
    setFormData(prev => ({
      ...prev,
      [`${blockIndex}-${fieldIndex}`]: value
    }));
    // Clear previous check result for this field when answer changes
    const field = getFieldFromBlock(blockIndex, fieldIndex);
    if (field) {
      const fieldId = field.id || field._id || field.fieldId || `field_${blockIndex}_${fieldIndex}`;
      setFieldChecks(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Helper to get field object from block/field indexes
  const getFieldFromBlock = (blockIndex, fieldIndex) => {
    const blocks = task.contentBlocks || [];
    const block = blocks[blockIndex];
    if (!block || block.type !== 'form') return null;
    const data = block.data || block;
    return (data.fields || [])[fieldIndex] || null;
  };

  // Check a single field using taskId (no attempt needed)
  const handleCheckField = async (field, blockIndex, fieldIndex) => {
    if (!taskId) return;

    const fieldId = field.id || field._id || field.fieldId || `field_${blockIndex}_${fieldIndex}`;
    const fieldKey = `${blockIndex}-${fieldIndex}`;
    const answer = formData[fieldKey] || '';

    // Don't check empty fields
    const isEmpty = !answer || (typeof answer === 'string' && !answer.trim()) || (Array.isArray(answer) && answer.length === 0);
    if (isEmpty) return;

    try {
      setCheckingField(fieldId);
      const result = await checkSchreibenField(taskId, fieldId, answer);
      setFieldChecks(prev => ({ ...prev, [fieldId]: result }));
    } catch (err) {
      console.error('Error checking field:', err);
    } finally {
      setCheckingField(null);
    }
  };

  // Navigate to regular questions in ExamPage
  const handleStartExercise = () => {
    if (examAttemptId) {
      navigate(`/student/exam/${examAttemptId}?showQuestions=true`);
    }
  };

  // Get display result for a field
  const getFieldResult = (field, blockIndex, fieldIndex) => {
    const fieldId = field.id || field._id || field.fieldId || `field_${blockIndex}_${fieldIndex}`;
    return fieldChecks[fieldId] || null;
  };

  // Check if a field is a student-answerable field (not prefilled, not non-student)
  const isStudentField = (field) => {
    return field.type !== 'prefilled' && field.isStudentField !== false;
  };

  const renderBlock = (block, blockIndex) => {
    const data = block.data || block;

    switch (block.type) {
      case 'text': {
        const textContent = data.content || '';
        const isHtml = typeof textContent === 'string' && /<[a-z][\s\S]*>/i.test(textContent);
        const blockStyle = {
          backgroundColor: data.bgColor || '#f8fafc',
          color: data.textColor || '#334155',
        };
        return (
          <div
            key={block.id || blockIndex}
            className="schreiben-text-block mb-4 p-5 rounded-xl border-l-4 border-blue-500 min-w-0"
            style={blockStyle}
          >
            {isHtml ? (
              <div
                className="text-base leading-relaxed text-left rich-text-content"
                style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(textContent)) }}
              />
            ) : (
              <p className="text-base leading-relaxed text-left" style={{ wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                {textContent}
              </p>
            )}
          </div>
        );
      }

      case 'image':
        return (
          <div
            key={block.id || blockIndex}
            className="mb-4 text-center"
          >
            <img
              src={data.src || data.url}
              alt={data.alt || 'صورة'}
              className="max-w-full rounded-xl shadow-md mx-auto"
            />
            {(data.caption || data.alt) && (
              <p className="mt-2 text-sm text-slate-500">
                {data.caption || data.alt}
              </p>
            )}
          </div>
        );

      case 'form':
        const formTitle = data.title || '';
        const formTitleIsHtml = typeof formTitle === 'string' && /<[a-z][\s\S]*>/i.test(formTitle);
        return (
          <div
            key={block.id || blockIndex}
            className="mb-4 p-5 bg-white rounded-xl border border-slate-200 min-w-0"
          >
            {formTitle && (
              <div className="mb-4 text-base font-semibold text-slate-800">
                {formTitleIsHtml ? (
                  <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(formTitle)) }} />
                ) : (
                  <h4>{formTitle}</h4>
                )}
              </div>
            )}
            <div className="space-y-4">
              {(data.fields || []).map((field, fieldIndex) => {
                const result = getFieldResult(field, blockIndex, fieldIndex);
                const fieldId = field.id || field._id || field.fieldId || `field_${blockIndex}_${fieldIndex}`;
                const fieldKey = `${blockIndex}-${fieldIndex}`;
                const answer = formData[fieldKey] || '';
                const hasAnswer = answer && (typeof answer === 'string' ? answer.trim() : (Array.isArray(answer) && answer.length > 0));
                const isChecking = checkingField === fieldId;

                return (
                  <div key={fieldIndex}>
                    {field.label && (
                      <label className="block mb-2 font-medium text-slate-700 text-sm">
                        {field.label}
                      </label>
                    )}

                    {/* Field input + check button row - min-w-0 يمنع النص من الخروج عن الحدود */}
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        {renderField(field, blockIndex, fieldIndex)}
                      </div>
                      {/* Check button - only for student fields */}
                      {isStudentField(field) && taskId && (
                        <button
                          type="button"
                          onClick={() => handleCheckField(field, blockIndex, fieldIndex)}
                          disabled={isChecking || !hasAnswer}
                          className={`flex-shrink-0 mt-0.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isChecking
                              ? 'bg-slate-100 text-slate-400 cursor-wait'
                              : !hasAnswer
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 cursor-pointer'
                          }`}
                        >
                          {isChecking ? '...' : 'تحقق'}
                        </button>
                      )}
                    </div>

                    <FieldResultBadge result={result} />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'cards': {
        const cards = data.cards || [];
        const layout = data.cardsLayout || 'vertical';
        if (cards.length === 0) return null;
        return (
          <div
            key={block.id || blockIndex}
            className="mb-4"
            style={{
              display: 'grid',
              gridTemplateColumns: layout === 'horizontal' ? '1fr' : 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {cards.map((card, idx) => {
              const cardContent = card.content || '';
              const cardTitle = card.title || '';
              const contentIsHtml = typeof cardContent === 'string' && /<[a-z][\s\S]*>/i.test(cardContent);
              const titleIsHtml = typeof cardTitle === 'string' && /<[a-z][\s\S]*>/i.test(cardTitle);
              const colorKey = card.color || 'amber';
              const theme = CARD_COLORS_MAP[colorKey] || CARD_COLORS_MAP.amber;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border min-w-0"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                >
                  {cardTitle && (
                    <div className="text-sm font-semibold mb-2">
                      {titleIsHtml ? (
                        <div className="rich-text-content" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(cardTitle)) }} />
                      ) : (
                        <h4>{cardTitle}</h4>
                      )}
                    </div>
                  )}
                  {contentIsHtml ? (
                    <div
                      className="text-sm leading-relaxed text-left rich-text-content"
                      style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(cardContent)) }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-left whitespace-pre-wrap">{cardContent}</p>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderField = (field, blockIndex, fieldIndex) => {
    const fieldKey = `${blockIndex}-${fieldIndex}`;
    const value = formData[fieldKey] || '';

    switch (field.type) {
      case 'text_input':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(blockIndex, fieldIndex, e.target.value)}
            placeholder={field.placeholder || 'اكتب هنا...'}
            rows={1}
            className="schreiben-form-textinput w-full min-w-0 p-3 py-2.5 border-2 border-slate-200 rounded-lg text-base leading-relaxed resize-y focus:outline-none focus:border-blue-500 transition-colors"
            dir="ltr"
          />
        );

      case 'prefilled':
        return (
          <div className="p-4 bg-slate-100 rounded-lg text-base text-slate-700 min-w-0" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }} dir="ltr">
            {field.value}
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(blockIndex, fieldIndex, e.target.value)}
            className="w-full p-3 border-2 border-slate-200 bg-white rounded-lg text-base focus:outline-none focus:border-blue-500"
          >
            <option value="">اختر...</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {(field.options || []).map((opt, i) => {
              const selectedValues = Array.isArray(value) ? value : [];
              const isChecked = selectedValues.includes(opt);
              return (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all cursor-pointer ${
                    isChecked
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      let newValues = [...selectedValues];
                      if (e.target.checked) {
                        newValues.push(opt);
                      } else {
                        newValues = newValues.filter(v => v !== opt);
                      }
                      handleFieldChange(blockIndex, fieldIndex, newValues);
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-base text-slate-700">{opt}</span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {task.level}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
              {providerLabels[task.provider] || task.provider}
            </span>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            Back →
          </button>
        </div>

        {/* Task Title - دعم HTML */}
        <div className="mb-6 text-left">
          <div className="text-xl font-bold text-slate-900 mb-2">
            ✍️ {typeof task.title === 'string' && /<[a-z][\s\S]*>/i.test(task.title) ? (
              <span className="rich-text-content" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(task.title)) }} />
            ) : (
              task.title
            )}
          </div>
          {task.instructions && (
            <div
              className="p-4 rounded-xl min-w-0"
              style={{
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                backgroundColor: task.instructionsBgColor || '#fffbeb',
                border: `1px solid ${task.instructionsBgColor ? (PARAGRAPH_BORDER_MAP[task.instructionsBgColor] || task.instructionsBgColor) : '#fde68a'}`,
                color: task.instructionsTextColor || undefined,
              }}
            >
              {typeof task.instructions === 'string' && /<[a-z][\s\S]*>/i.test(task.instructions) ? (
                <div className="text-sm leading-relaxed text-left rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(task.instructions)) }} />
              ) : (
                <p className="text-sm leading-relaxed text-left whitespace-pre-wrap" style={{ margin: 0 }}>{task.instructions}</p>
              )}
            </div>
          )}
        </div>

        {/* Content Blocks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 text-left min-w-0">
          {(task.contentBlocks || []).map((block, index) => renderBlock(block, index))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            ← Back
          </button>
          {hasQuestions && examAttemptId && (
            <button
              onClick={handleStartExercise}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              ابدأ التمرين →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Tasks List View - Modern Design
const TasksListView = ({ tasks, onSelectTask, selectedLevel, setSelectedLevel, selectedProvider, setSelectedProvider }) => {
  const { levelNames: levels } = useLevels();
  const providers = [
    { value: 'goethe', label: 'Goethe' },
    { value: 'telc', label: 'TELC' },
    { value: 'oesd', label: 'ÖSD' },
    { value: 'ecl', label: 'ECL' },
    { value: 'dtb', label: 'DTB' },
    { value: 'dtz', label: 'DTZ' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            ✍️ Schreiben - الكتابة
          </h1>
          <p className="text-slate-600">
            تدرب على مهارات الكتابة باللغة الألمانية
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">كل المستويات</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">كل المزودين</option>
            {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Tasks Grid */}
        {tasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500">لا توجد مهام كتابة متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                onClick={() => onSelectTask(task._id)}
                className="bg-white rounded-xl p-5 cursor-pointer transition-all border-2 border-transparent hover:border-blue-500 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {task.title}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {task.level}
                  </span>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                    {providerLabels[task.provider] || task.provider}
                  </span>
                </div>
                {task.instructions && (
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {typeof task.instructions === 'string' && /<[a-z][\s\S]*>/i.test(task.instructions)
                      ? task.instructions.replace(/<[^>]*>/g, '').trim().slice(0, 120)
                      : task.instructions}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                    ابدأ الكتابة
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function SchreibenPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const hasQuestions = searchParams.get('hasQuestions') === 'true';
  const examAttemptId = searchParams.get('examAttemptId');

  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');

  useEffect(() => {
    if (!taskId) {
      loadTasks();
    }
  }, [taskId, selectedLevel, selectedProvider]);

  useEffect(() => {
    if (taskId) {
      loadTask(taskId);
    }
  }, [taskId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { status: 'published' };
      if (selectedLevel) params.level = selectedLevel;
      if (selectedProvider) params.provider = selectedProvider;

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

  const loadTask = async (id) => {
    try {
      setLoading(true);
      setError('');
      const data = await getSchreibenTask(id);
      const task = data.task || data;
      setCurrentTask(task);
    } catch (err) {
      console.error('Error loading task:', err);
      setError('حدث خطأ أثناء تحميل المهمة');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (id) => {
    navigate(`/student/schreiben/${id}`);
  };

  const handleBack = () => {
    if (attemptId) {
      navigate('/welcome');
    } else {
      setCurrentTask(null);
      navigate('/student/schreiben');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm"
          >
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  if (taskId && currentTask) {
    return (
      <TaskDetailView
        task={currentTask}
        taskId={taskId}
        onBack={handleBack}
        hasQuestions={hasQuestions}
        examAttemptId={examAttemptId}
      />
    );
  }

  return (
    <TasksListView
      tasks={tasks}
      onSelectTask={handleSelectTask}
      selectedLevel={selectedLevel}
      setSelectedLevel={setSelectedLevel}
      selectedProvider={selectedProvider}
      setSelectedProvider={setSelectedProvider}
    />
  );
}

export default SchreibenPage;
