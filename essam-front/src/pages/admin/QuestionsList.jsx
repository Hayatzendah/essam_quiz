import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsAPI } from '../../services/questionsAPI';
import './QuestionsList.css';

function QuestionsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  // Load questions function - memoized with useCallback to avoid unnecessary re-renders
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      
      // إضافة البحث فقط إذا كان موجوداً
      // الـ API endpoint /questions يتوقع معامل 'text' للبحث
      if (searchTerm && searchTerm.trim() !== '') {
        params.text = searchTerm.trim();
      }
      
      console.log('🔍 Sending search params:', params);
      console.log('🔍 Search term:', searchTerm);
      
      const response = await questionsAPI.getAll(params);
      
      // Response format: { page, limit, total, items: [...] }
      let questionsData = response.items || response || [];
      
      // فلترة إضافية على الفرونت إند إذا كان الباك إند لا يفلتر بشكل صحيح
      // هذا حل مؤقت للتأكد من أن البحث يعمل
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        questionsData = questionsData.filter(question => {
          const prompt = (question.prompt || '').toLowerCase();
          return prompt.includes(searchLower);
        });
        console.log('📊 Questions after frontend filtering:', questionsData.length);
      }
      
      console.log('📊 Questions returned:', questionsData.length);
      
      setQuestions(questionsData);
      
      // تحديث pagination - إذا كان هناك بحث، نستخدم عدد النتائج المفلترة
      if (searchTerm && searchTerm.trim() !== '') {
        setPagination(prev => ({
          ...prev,
          page: 1, // إعادة تعيين الصفحة عند البحث
          total: questionsData.length, // استخدام عدد النتائج المفلترة
        }));
      } else if (response.page !== undefined && response.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          page: response.page,
          limit: response.limit || prev.limit,
          total: response.total,
        }));
      } else {
        // إذا لم يكن هناك pagination في الـ response، نستخدم القيم الافتراضية
        setPagination(prev => ({
          ...prev,
          total: questionsData.length,
        }));
      }
    } catch (err) {
      console.error('Error loading questions:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء تحميل الأسئلة'
      );
      setQuestions([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
      }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  // Always fetch questions when component mounts or search changes
  // This ensures fresh data is always loaded from the API, not from stale state
  useEffect(() => {
    // Debounce البحث - انتظر 500ms بعد توقف المستخدم عن الكتابة
    const timeoutId = setTimeout(() => {
      loadQuestions();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [loadQuestions]);

  const handleDelete = async (questionId, hard = false) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذا السؤال؟ ${hard ? '(حذف نهائي)' : '(حذف مؤقت)'}`)) {
      return;
    }

    try {
      setDeletingId(questionId);
      setError('');
      setSuccess('');
      
      await questionsAPI.delete(questionId, hard);
      setSuccess('تم حذف السؤال بنجاح');
      
      // إعادة تحميل الأسئلة
      await loadQuestions();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting question:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء حذف السؤال'
      );
    } finally {
      setDeletingId(null);
    }
  };


  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // إعادة تعيين الصفحة عند البحث
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const getQuestionTypeLabel = (qType) => {
    const types = {
      mcq: 'اختيار متعدد',
      true_false: 'صحيح/خطأ',
      fill: 'ملء الفراغ',
      match: 'مطابقة',
      reorder: 'إعادة ترتيب',
    };
    return types[qType] || qType;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      draft: 'مسودة',
      published: 'منشور',
      archived: 'مؤرشف',
    };
    return statuses[status] || status;
  };

  return (
    <div className="questions-list-page">
      <div className="page-header">
        <button onClick={() => navigate('/welcome')} className="back-btn" title="العودة للوحة التحكم">
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
        <h1>جميع الأسئلة</h1>
      </div>

      <div className="questions-list-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Search */}
        <div className="filters-section">
          <div className="filter-group" style={{ flex: 1, maxWidth: '500px' }}>
            <label>🔍 البحث في الأسئلة</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ابحث في نص السؤال..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '2px solid #e5e7eb',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>جاري تحميل الأسئلة...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchTerm && searchTerm.trim() !== '' 
                ? `لا توجد نتائج للبحث عن: "${searchTerm}"`
                : 'لا توجد أسئلة'
              }
            </p>
            {searchTerm && searchTerm.trim() !== '' && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                مسح البحث وعرض جميع الأسئلة
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="questions-count">
              <p>
                إجمالي الأسئلة: <strong>{pagination.total || questions.length}</strong>
              </p>
            </div>

            <div className="questions-grid">
              {questions.map((question) => (
                <div key={question.id || question._id} className={`question-card${question.contentOnly ? ' content-only-card' : ''}`}>
                  <div className="question-header">
                    <div className="question-meta">
                      {question.contentOnly ? (
                        <span className="question-type" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>محتوى تعليمي</span>
                      ) : (
                        <span className="question-type">{getQuestionTypeLabel(question.qType)}</span>
                      )}
                      <span className={`question-status status-${question.status}`}>
                        {getStatusLabel(question.status)}
                      </span>
                    </div>
                    <div className="question-actions">
                      <button
                        onClick={() => navigate(`/admin/questions/${question.id || question._id}/edit`)}
                        className="edit-btn"
                        title="تعديل"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(question.id || question._id, false)}
                        className="delete-btn"
                        disabled={deletingId === (question.id || question._id)}
                        title="حذف مؤقت"
                      >
                        {deletingId === (question.id || question._id) ? '⏳' : '🗑️'}
                      </button>
                      <button
                        onClick={() => handleDelete(question.id || question._id, true)}
                        className="delete-btn hard-delete"
                        disabled={deletingId === (question.id || question._id)}
                        title="حذف نهائي"
                      >
                        {deletingId === (question.id || question._id) ? '⏳' : '❌'}
                      </button>
                    </div>
                  </div>

                  <div className="question-body">
                    <p className="question-prompt">
                      {question.contentOnly ? (
                        <span style={{ color: '#1e40af', fontStyle: 'italic' }}>
                          {question.contentBlocks && question.contentBlocks.length > 0
                            ? `📋 ${question.contentBlocks.length} بلوك محتوى (${question.contentBlocks.map(b => b.type === 'paragraph' ? 'فقرة' : b.type === 'image' ? 'صورة' : b.type === 'cards' ? 'بطاقات' : b.type === 'audio' ? 'صوت' : b.type).join('، ')})`
                            : question.readingPassage ? '📖 فقرة قراءة' : '📋 محتوى تعليمي'}
                        </span>
                      ) : (
                        <>
                          {question.prompt?.substring(0, 150)}
                          {question.prompt?.length > 150 ? '...' : ''}
                        </>
                      )}
                    </p>

                    <div className="question-details">
                      {question.provider && (
                        <span className="detail-badge">📦 {question.provider}</span>
                      )}
                      {question.level && (
                        <span className="detail-badge">📊 {question.level}</span>
                      )}
                      {question.section && (
                        <span className="detail-badge">📁 {question.section}</span>
                      )}
                      {question.tags && question.tags.length > 0 && (
                        <span className="detail-badge">
                          🏷️ {question.tags.slice(0, 3).join(', ')}
                          {question.tags.length > 3 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="page-btn"
                >
                  ← السابق
                </button>
                <span className="page-info">
                  الصفحة {pagination.page} من {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="page-btn"
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default QuestionsList;

