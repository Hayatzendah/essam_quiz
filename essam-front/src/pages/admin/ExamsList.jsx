import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';
import { useLevels } from '../../hooks/useLevels';
import './ExamsList.css';

function ExamsList() {
  const { levelNames } = useLevels();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({
    provider: '',
    level: '',
    status: '',
  });

  // Load exams function - memoized with useCallback
  const loadExams = useCallback(async () => {
    try {
      console.log('📥 ExamsList: Starting to load exams...');
      setLoading(true);
      setError('');
      
      const params = {};
      
      if (filters.provider) params.provider = filters.provider;
      if (filters.level) params.level = filters.level;
      if (filters.status) params.status = filters.status;
      
      console.log('📤 ExamsList: Sending request with params:', params);
      const response = await examsAPI.getAll(params);
      console.log('✅ ExamsList: Received response:', response);
      
      // Response format: { items: [...], count: ... }
      const examsData = response.items || response || [];
      console.log('📊 ExamsList: Setting exams data, count:', examsData.length);
      setExams(examsData);
    } catch (err) {
      console.error('Error loading exams:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      
      // Don't redirect on error - just show error message
      // The page should remain visible
      let errorMessage = 'حدث خطأ أثناء تحميل الامتحانات';
      
      if (err.response?.status === 401) {
        errorMessage = 'انتهت صلاحية جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.';
      } else if (err.response?.status === 403) {
        errorMessage = 'ليس لديك صلاحية لعرض الامتحانات.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : JSON.stringify(err.response.data.error);
      }
      
      setError(errorMessage);
      setExams([]); // Set empty array on error to show empty state
    } finally {
      setLoading(false);
    }
  }, [filters.provider, filters.level, filters.status]);

  // Always fetch exams when component mounts or filters change
  useEffect(() => {
    console.log('🔄 ExamsList: useEffect triggered, loading exams...');
    loadExams();
  }, [loadExams]);

  const handleArchive = async (examId) => {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا الامتحان؟ سيتم إخفاؤه من قائمة الامتحانات المتاحة للطلاب.')) {
      return;
    }

    try {
      setDeletingId(examId);
      setError('');
      setSuccess('');
      
      // أرشفة الامتحان باستخدام endpoint مخصص
      await examsAPI.archive(examId);
      setSuccess('تم أرشفة الامتحان بنجاح');
      setError(''); // إزالة أي أخطاء سابقة
      
      // إعادة تحميل الامتحانات بعد تأخير قصير
      setTimeout(async () => {
        await loadExams();
      }, 500);
      
      // إزالة رسالة النجاح بعد 3 ثوان
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error archiving exam:', err);
      const errorMessage = 
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء أرشفة الامتحان';
      
      setError(errorMessage);
      
      // إزالة رسالة الخطأ بعد 5 ثوان
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('⚠️ هل أنت متأكد من حذف هذا الامتحان نهائياً؟\n\nسيتم حذف الامتحان وجميع المحاولات المرتبطة به.\nهذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }

    // تأكيد إضافي
    if (!window.confirm('⚠️ تأكيد نهائي: هل أنت متأكد 100% من الحذف النهائي؟')) {
      return;
    }

    try {
      setDeletingId(examId);
      setError('');
      setSuccess('');
      
      // حذف الامتحان نهائياً
      await examsAPI.delete(examId);
      setSuccess('تم حذف الامتحان بنجاح');
      setError(''); // إزالة أي أخطاء سابقة
      
      // إعادة تحميل الامتحانات بعد تأخير قصير
      setTimeout(async () => {
        await loadExams();
      }, 500);
      
      // إزالة رسالة النجاح بعد 3 ثوان
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting exam:', err);
      
      // معالجة الأخطاء
      let errorMessage = 'حدث خطأ أثناء حذف الامتحان';
      
      if (err.response?.status === 404) {
        errorMessage = 'الامتحان غير موجود أو تم حذفه مسبقاً';
        // إذا كان الامتحان غير موجود، نعيد تحميل القائمة لإزالة العنصر المحذوف
        setTimeout(async () => {
          await loadExams();
        }, 500);
      } else if (err.response?.status === 403) {
        errorMessage = 'ليس لديك صلاحية لحذف هذا الامتحان';
      } else if (err.response?.status === 400) {
        const errorData = err.response?.data;
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        } else {
          errorMessage = 'لا يمكن حذف الامتحان. قد يكون هناك محاولات مرتبطة به.';
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      
      // إزالة رسالة الخطأ بعد 5 ثوان
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
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
    <div className="exams-list-page">
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
        <h1>جميع الامتحانات</h1>
      </div>

      <div className="exams-list-container">
        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button 
              onClick={() => setError('')} 
              className="close-error-btn"
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="success-message">
            <span>{success}</span>
            <button 
              onClick={() => setSuccess('')} 
              className="close-success-btn"
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>المزود</label>
            <select
              value={filters.provider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
            >
              <option value="">الكل</option>
              <option value="LiD">LiD</option>
              <option value="Deutschland-in-Leben">Deutschland-in-Leben</option>
              <option value="telc">telc</option>
              <option value="Goethe">Goethe</option>
              <option value="ÖSD">ÖSD</option>
              <option value="ECL">ECL</option>
              <option value="DTB">DTB</option>
              <option value="DTZ">DTZ</option>
              <option value="Grammatik">Grammatik</option>
              <option value="Wortschatz">Wortschatz</option>
            </select>
          </div>

          <div className="filter-group">
            <label>المستوى</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <option value="">الكل</option>
              {levelNames.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">الكل</option>
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>

          <button onClick={loadExams} className="refresh-btn">
            🔄 تحديث
          </button>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>جاري تحميل الامتحانات...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد امتحانات</p>
          </div>
        ) : (
          <>
            <div className="exams-count">
              <p>
                إجمالي الامتحانات: <strong>{exams.length}</strong>
              </p>
            </div>

            <div className="exams-grid">
              {exams
                ?.filter(Boolean) // Remove any null/undefined exams
                .map((exam) => (
                <div key={exam.id || exam._id} className="exam-card">
                  <div className="exam-header">
                    <div className="exam-title-section">
                      <h3>{exam?.title || 'بدون عنوان'}</h3>
                      <span className={`exam-status status-${exam?.status || 'draft'}`}>
                        {getStatusLabel(exam?.status || 'draft')}
                      </span>
                    </div>
                    <div className="exam-actions">
                      <button
                        onClick={() => navigate(`/admin/exams/${exam?.id || exam?._id}/sections`)}
                        className="sections-btn"
                        title="إدارة الأقسام"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => navigate(`/admin/exams/${exam?.id || exam?._id}/edit`)}
                        className="edit-btn"
                        title="تعديل"
                      >
                        ✏️
                      </button>
                      {exam?.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(exam?.id || exam?._id)}
                          className="archive-btn"
                          disabled={deletingId === (exam?.id || exam?._id)}
                          title="أرشفة (إخفاء من قائمة الطلاب)"
                        >
                          {deletingId === (exam?.id || exam?._id) ? '⏳' : '📦'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exam?.id || exam?._id)}
                        className="delete-btn"
                        disabled={deletingId === (exam?.id || exam?._id)}
                        title="حذف نهائي"
                      >
                        {deletingId === (exam?.id || exam?._id) ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>

                  <div className="exam-body">
                    <div className="exam-details">
                      {exam?.provider && (
                        <span className="detail-badge">📦 {exam.provider}</span>
                      )}
                      {exam?.level && (
                        <span className="detail-badge">📊 {exam.level}</span>
                      )}
                      {exam?.timeLimitMin > 0 && (
                        <span className="detail-badge">⏱️ {exam.timeLimitMin} دقيقة</span>
                      )}
                      {exam?.attemptLimit > 0 && (
                        <span className="detail-badge">🔄 {exam.attemptLimit} محاولة</span>
                      )}
                      {(exam?.attemptLimit === 0 || exam?.attemptLimit === undefined) && (
                        <span className="detail-badge">🔄 محاولات غير محدودة</span>
                      )}
                    </div>

                    {exam.sections && exam.sections.length > 0 && (
                      <div className="exam-sections">
                        <p className="sections-title">الأقسام:</p>
                        <div className="sections-list">
                          {exam.sections
                            .filter(Boolean) // Remove any null/undefined sections
                            .map((section, index) => (
                              <div key={index} className="section-item">
                                <span className="section-name">{section?.name || section?.section || '-'}</span>
                                <span className="section-quota">{section?.quota ?? 0} سؤال</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {exam?.randomizeQuestions && (
                      <div className="exam-feature">
                        <span>🔀 ترتيب عشوائي للأسئلة</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExamsList;

