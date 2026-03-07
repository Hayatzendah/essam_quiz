import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';
import { questionsAPI } from '../../services/questionsAPI';
import './ExamSections.css';

const SKILL_OPTIONS = [
  { value: 'hoeren', label: 'Hören', icon: '🎧' },
  { value: 'lesen', label: 'Lesen', icon: '📖' },
  { value: 'schreiben', label: 'Schreiben', icon: '✍️' },
  { value: 'sprechen', label: 'Sprechen', icon: '🗣️' },
  { value: 'sprachbausteine', label: 'Sprachbausteine', icon: '🧩' },
];

const getSkillInfo = (skill) => SKILL_OPTIONS.find((s) => s.value === skill) || { label: skill, icon: '📄' };

function ExamSections() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Exam info
  const [exam, setExam] = useState(null);

  // Sections state
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loadingSections, setLoadingSections] = useState(true);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    title: '',
    skill: 'hoeren',
    teilNumber: 1,
    timeLimitMin: 0,
    order: 0,
  });
  const [savingSection, setSavingSection] = useState(false);

  // Questions in section
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Add question
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [questionSearchResults, setQuestionSearchResults] = useState([]);
  const [searchingQuestions, setSearchingQuestions] = useState(false);
  const [addingQuestionId, setAddingQuestionId] = useState(null);
  const [questionPoints, setQuestionPoints] = useState(1);

  // Inline points editing
  const [editingPointsQId, setEditingPointsQId] = useState(null);
  const [editingPointsValue, setEditingPointsValue] = useState('');

  // General
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load exam info
  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await examsAPI.getById(examId);
        setExam(data);
      } catch (err) {
        console.error('Error loading exam:', err);
      }
    };
    loadExam();
  }, [examId]);

  // Load sections
  const loadSections = useCallback(async () => {
    try {
      setLoadingSections(true);
      setError('');
      const data = await examsAPI.getSections(examId);
      const sectionsList = data.sections || data || [];
      setSections(sectionsList);
    } catch (err) {
      console.error('Error loading sections:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل الأقسام');
    } finally {
      setLoadingSections(false);
    }
  }, [examId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // Load questions when section is selected
  useEffect(() => {
    if (selectedSection) {
      const questions = selectedSection.questions || selectedSection.items || [];
      setSectionQuestions(questions);
    } else {
      setSectionQuestions([]);
    }
  }, [selectedSection]);

  // Refresh selected section data from sections list
  useEffect(() => {
    if (selectedSection) {
      const updated = sections.find((s) => s.key === selectedSection.key);
      if (updated) {
        setSelectedSection(updated);
      }
    }
  }, [sections]);

  // Auto-select section from URL on return from edit
  useEffect(() => {
    const sectionKey = searchParams.get('sectionKey');
    if (sectionKey && sections.length > 0 && !selectedSection) {
      const section = sections.find((s) => s.key === sectionKey);
      if (section) {
        setSelectedSection(section);
      }
    }
  }, [searchParams, sections, selectedSection]);

  // Section CRUD
  const handleSectionFormChange = (field, value) => {
    setSectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateSection = () => {
    setEditingSection(null);
    setSectionForm({
      title: '',
      skill: 'hoeren',
      teilNumber: 1,
      timeLimitMin: 0,
      order: sections.length,
    });
    setShowSectionForm(true);
  };

  const openEditSection = (section) => {
    setEditingSection(section);
    setSectionForm({
      title: section.title || '',
      skill: section.skill || 'hoeren',
      teilNumber: section.teilNumber || 1,
      timeLimitMin: section.timeLimitMin || 0,
      order: section.order ?? 0,
    });
    setShowSectionForm(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title.trim()) {
      setError('يرجى إدخال عنوان القسم');
      return;
    }

    try {
      setSavingSection(true);
      setError('');

      const payload = {
        title: sectionForm.title,
        skill: sectionForm.skill,
        teilNumber: sectionForm.teilNumber,
        timeLimitMin: sectionForm.timeLimitMin,
        order: sectionForm.order,
      };

      if (editingSection) {
        await examsAPI.updateSection(examId, editingSection.key, payload);
        setSuccess('تم تحديث القسم بنجاح');
      } else {
        await examsAPI.createSection(examId, payload);
        setSuccess('تم إنشاء القسم بنجاح');
      }

      setShowSectionForm(false);
      setEditingSection(null);
      await loadSections();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving section:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ القسم');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionKey) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟')) return;

    try {
      setError('');
      await examsAPI.deleteSection(examId, sectionKey);
      setSuccess('تم حذف القسم بنجاح');

      if (selectedSection?.key === sectionKey) {
        setSelectedSection(null);
      }

      await loadSections();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting section:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء حذف القسم');
    }
  };

  // Question management
  const handleSearchQuestions = async () => {
    if (!questionSearchQuery.trim()) return;

    try {
      setSearchingQuestions(true);
      const data = await questionsAPI.getAll({
        search: questionSearchQuery,
        limit: 20,
      });
      const results = data.items || data || [];
      // Filter out questions already in the section
      const existingIds = new Set(sectionQuestions.map((q) => q.questionId || q._id || q.id));
      setQuestionSearchResults(results.filter((q) => !existingIds.has(q._id || q.id)));
    } catch (err) {
      console.error('Error searching questions:', err);
      setError('حدث خطأ أثناء البحث عن الأسئلة');
    } finally {
      setSearchingQuestions(false);
    }
  };

  const handleAddQuestion = async (questionId) => {
    if (!selectedSection) return;

    try {
      setAddingQuestionId(questionId);
      setError('');
      await examsAPI.addQuestionToSection(examId, selectedSection.key, questionId, questionPoints);
      setSuccess('تم إضافة السؤال بنجاح');

      // Remove from search results
      setQuestionSearchResults((prev) => prev.filter((q) => (q._id || q.id) !== questionId));

      await loadSections();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding question:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء إضافة السؤال');
    } finally {
      setAddingQuestionId(null);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!selectedSection) return;
    if (!window.confirm('هل أنت متأكد من إزالة هذا السؤال من القسم؟')) return;

    try {
      setError('');
      await examsAPI.removeQuestionFromSection(examId, selectedSection.key, questionId);
      setSuccess('تم إزالة السؤال بنجاح');
      await loadSections();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing question:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء إزالة السؤال');
    }
  };

  const handleMoveQuestion = async (index, direction) => {
    if (!selectedSection) return;
    const newQuestions = [...sectionQuestions];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

    const questionIds = newQuestions.map((q) => q.questionId || q._id || q.id);

    try {
      setError('');
      await examsAPI.reorderSectionQuestions(examId, selectedSection.key, questionIds);
      await loadSections();
    } catch (err) {
      console.error('Error reordering questions:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء إعادة ترتيب الأسئلة');
    }
  };

  const handleEditQuestion = (qId) => {
    const returnTo = `/admin/exams/${examId}/sections?sectionKey=${encodeURIComponent(selectedSection.key)}`;
    navigate(`/admin/questions/${qId}/edit?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleStartEditPoints = (qId, currentPoints) => {
    setEditingPointsQId(qId);
    setEditingPointsValue(String(currentPoints ?? 1));
  };

  const handleSavePoints = async (qId) => {
    const points = parseInt(editingPointsValue, 10);
    if (isNaN(points) || points < 0) {
      setError('يرجى إدخال قيمة صحيحة للنقاط');
      return;
    }
    try {
      setError('');
      await examsAPI.updateQuestionPoints(examId, selectedSection.key, qId, points);
      setEditingPointsQId(null);
      setEditingPointsValue('');
      await loadSections();
    } catch (err) {
      console.error('Error updating points:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحديث النقاط');
    }
  };

  const handleCancelEditPoints = () => {
    setEditingPointsQId(null);
    setEditingPointsValue('');
  };

  const getQuestionTypeLabel = (type) => {
    const types = {
      'multiple-choice': 'اختيار متعدد',
      'true-false': 'صح/خطأ',
      'fill-blank': 'ملء الفراغ',
      'matching': 'مطابقة',
      'ordering': 'ترتيب',
      'short-answer': 'إجابة قصيرة',
    };
    return types[type] || type;
  };

  return (
    <div className="exam-sections-page">
      {/* Header */}
      <div className="es-page-header">
        <button onClick={() => navigate('/admin/exams')} className="es-back-btn" title="العودة للامتحانات">
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
              stroke="#000000"
            />
          </svg>
        </button>
        <div className="es-header-info">
          <h1>إدارة أقسام الامتحان</h1>
          {exam && <p className="es-exam-title">{exam.title}</p>}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="es-error">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="es-success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Main Content - Two Panels */}
      <div className="es-content">
        {/* Left Panel - Sections List */}
        <div className="es-panel es-sections-panel">
          <div className="es-panel-header">
            <h2>الأقسام ({sections.length})</h2>
            <button onClick={openCreateSection} className="es-add-btn">
              + قسم جديد
            </button>
          </div>

          {loadingSections ? (
            <div className="es-loading">
              <div className="es-spinner"></div>
              <p>جاري التحميل...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="es-empty">
              <p>لا توجد أقسام بعد</p>
              <p className="es-empty-hint">اضغط "قسم جديد" لإضافة قسم</p>
            </div>
          ) : (
            <div className="es-sections-list">
              {sections.map((section) => {
                const skillInfo = getSkillInfo(section.skill);
                const isSelected = selectedSection?.key === section.key;
                const questionsCount = section.questionCount ?? section.questions?.length ?? section.items?.length ?? 0;

                return (
                  <div
                    key={section.key}
                    className={`es-section-card ${isSelected ? 'es-section-selected' : ''}`}
                    onClick={() => setSelectedSection(section)}
                  >
                    <div className="es-section-top">
                      <div className="es-section-info">
                        <span className="es-skill-icon">{skillInfo.icon}</span>
                        <div>
                          <h3 className="es-section-title">{section.title}</h3>
                          <div className="es-section-meta">
                            <span className="es-skill-badge">{skillInfo.label}</span>
                            {section.teilNumber && (
                              <span className="es-teil-badge">Teil {section.teilNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="es-section-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditSection(section);
                          }}
                          className="es-icon-btn es-edit-icon"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        {/* لا نعرض زر الحذف للقسم الافتراضي (امتحانات بدون أقسام) */}
                        {section.key !== '_default' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.key);
                            }}
                            className="es-icon-btn es-delete-icon"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="es-section-bottom">
                      <span className="es-questions-count">
                        {questionsCount} سؤال
                      </span>
                      {section.timeLimitMin > 0 && (
                        <span className="es-time-badge">⏱️ {section.timeLimitMin} د</span>
                      )}
                      <span className="es-order-badge">ترتيب: {section.order ?? '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel - Questions in Section */}
        <div className="es-panel es-questions-panel">
          {selectedSection ? (
            <>
              <div className="es-panel-header">
                <h2>
                  أسئلة: {selectedSection.title}
                  <span className="es-count-badge">{sectionQuestions.length}</span>
                </h2>
                <button onClick={() => setShowQuestionSearch(true)} className="es-add-btn">
                  + إضافة سؤال
                </button>
              </div>

              {sectionQuestions.length === 0 ? (
                <div className="es-empty">
                  <p>لا توجد أسئلة في هذا القسم</p>
                  <p className="es-empty-hint">اضغط "إضافة سؤال" للبحث وإضافة أسئلة</p>
                </div>
              ) : (
                <div className="es-questions-list">
                  {sectionQuestions.map((q, index) => {
                    const qId = q.questionId || q._id || q.id;
                    return (
                      <div key={qId} className="es-question-item">
                        <div className="es-question-order">
                          <button
                            onClick={() => handleMoveQuestion(index, -1)}
                            disabled={index === 0}
                            className="es-move-btn"
                            title="نقل لأعلى"
                          >
                            ▲
                          </button>
                          <span className="es-question-number">{index + 1}</span>
                          <button
                            onClick={() => handleMoveQuestion(index, 1)}
                            disabled={index === sectionQuestions.length - 1}
                            className="es-move-btn"
                            title="نقل لأسفل"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="es-question-content">
                          <p className="es-question-prompt">
                            {(() => {
                              const raw = q.prompt || q.question?.prompt || q.questionData?.prompt || '';
                              if (!raw) return 'سؤال #' + (index + 1);
                              // إزالة وسوم HTML لعرض النص فقط في القائمة
                              const tmp = document.createElement('div');
                              tmp.innerHTML = raw;
                              return tmp.textContent || tmp.innerText || raw;
                            })()}
                          </p>
                          <div className="es-question-badges">
                            {(q.type || q.question?.type || q.questionData?.type) && (
                              <span className="es-type-badge">
                                {getQuestionTypeLabel(q.type || q.question?.type || q.questionData?.type)}
                              </span>
                            )}
                            {q.points != null && (
                              editingPointsQId === qId ? (
                                <span className="es-points-edit-wrapper">
                                  <input
                                    type="number"
                                    className="es-points-edit-input"
                                    value={editingPointsValue}
                                    onChange={(e) => setEditingPointsValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSavePoints(qId);
                                      if (e.key === 'Escape') handleCancelEditPoints();
                                    }}
                                    onBlur={() => handleSavePoints(qId)}
                                    min="0"
                                    autoFocus
                                  />
                                </span>
                              ) : (
                                <span className="es-points-badge">
                                  {q.points} نقطة
                                  <button
                                    className="es-points-edit-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditPoints(qId, q.points);
                                    }}
                                    title="تعديل النقاط"
                                  >
                                    ✏️
                                  </button>
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="es-question-actions">
                          <button
                            onClick={() => handleEditQuestion(qId)}
                            className="es-edit-question-btn"
                            title="تعديل السؤال"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(qId)}
                            className="es-remove-btn"
                            title="إزالة من القسم"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="es-empty es-empty-full">
              <p>اختر قسماً من القائمة</p>
              <p className="es-empty-hint">اضغط على أي قسم لعرض وإدارة أسئلته</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Form Modal */}
      {showSectionForm && (
        <div className="es-modal-overlay" onClick={() => setShowSectionForm(false)}>
          <div className="es-modal" onClick={(e) => e.stopPropagation()}>
            <div className="es-modal-header">
              <h3>{editingSection ? 'تعديل القسم' : 'إضافة قسم جديد'}</h3>
              <button onClick={() => setShowSectionForm(false)} className="es-modal-close">✕</button>
            </div>
            <div className="es-modal-body">
              <div className="es-form-group">
                <label>عنوان القسم</label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => handleSectionFormChange('title', e.target.value)}
                  placeholder="مثال: Hören Teil 1"
                  className="es-input"
                />
              </div>
              <div className="es-form-row">
                <div className="es-form-group">
                  <label>المهارة</label>
                  <select
                    value={sectionForm.skill}
                    onChange={(e) => handleSectionFormChange('skill', e.target.value)}
                    className="es-select"
                  >
                    {SKILL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="es-form-group">
                  <label>رقم التايل (Teil)</label>
                  <input
                    type="number"
                    value={sectionForm.teilNumber}
                    onChange={(e) => handleSectionFormChange('teilNumber', parseInt(e.target.value) || 1)}
                    min="1"
                    className="es-input"
                  />
                </div>
              </div>
              <div className="es-form-row">
                <div className="es-form-group">
                  <label>الوقت (دقائق)</label>
                  <input
                    type="number"
                    value={sectionForm.timeLimitMin}
                    onChange={(e) => handleSectionFormChange('timeLimitMin', parseInt(e.target.value) || 0)}
                    min="0"
                    className="es-input"
                  />
                </div>
                <div className="es-form-group">
                  <label>الترتيب</label>
                  <input
                    type="number"
                    value={sectionForm.order}
                    onChange={(e) => handleSectionFormChange('order', parseInt(e.target.value) || 0)}
                    min="0"
                    className="es-input"
                  />
                </div>
              </div>

              <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                بعد إنشاء القسم، أضف الأسئلة من صفحة إنشاء السؤال مع اختيار هذا القسم.
              </p>
            </div>
            <div className="es-modal-footer">
              <button onClick={() => setShowSectionForm(false)} className="es-cancel-btn">
                إلغاء
              </button>
              <button onClick={handleSaveSection} className="es-save-btn" disabled={savingSection}>
                {savingSection ? 'جاري الحفظ...' : editingSection ? 'تحديث' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Search Modal */}
      {showQuestionSearch && selectedSection && (
        <div className="es-modal-overlay" onClick={() => setShowQuestionSearch(false)}>
          <div className="es-modal es-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="es-modal-header">
              <h3>إضافة سؤال إلى: {selectedSection.title}</h3>
              <button onClick={() => setShowQuestionSearch(false)} className="es-modal-close">✕</button>
            </div>
            <div className="es-modal-body">
              <div className="es-search-bar">
                <input
                  type="text"
                  value={questionSearchQuery}
                  onChange={(e) => setQuestionSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchQuestions()}
                  placeholder="ابحث عن سؤال..."
                  className="es-input es-search-input"
                />
                <div className="es-points-input">
                  <label>النقاط:</label>
                  <input
                    type="number"
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(parseInt(e.target.value) || 1)}
                    min="1"
                    className="es-input es-small-input"
                  />
                </div>
                <button onClick={handleSearchQuestions} className="es-search-btn" disabled={searchingQuestions}>
                  {searchingQuestions ? 'جاري البحث...' : 'بحث'}
                </button>
              </div>

              {questionSearchResults.length > 0 ? (
                <div className="es-search-results">
                  {questionSearchResults.map((q) => {
                    const qId = q._id || q.id;
                    return (
                      <div key={qId} className="es-search-result-item">
                        <div className="es-result-info">
                          <p className="es-result-prompt">{q.prompt || 'بدون عنوان'}</p>
                          <div className="es-result-meta">
                            {q.type && <span className="es-type-badge">{getQuestionTypeLabel(q.type)}</span>}
                            {q.level && <span className="es-level-badge">{q.level}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddQuestion(qId)}
                          className="es-add-question-btn"
                          disabled={addingQuestionId === qId}
                        >
                          {addingQuestionId === qId ? '...' : '+ إضافة'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !searchingQuestions && (
                  <div className="es-empty">
                    <p>ابحث عن أسئلة لإضافتها</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamSections;
