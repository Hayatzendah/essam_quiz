import api from './api';

export const examsAPI = {
  // للمعلمين: إنشاء Exam جديد
  create: async (examData) => {
    const response = await api.post('/exams', examData);
    return response.data;
  },

  // للمعلمين: الحصول على قائمة الامتحانات
  getAll: async (params = {}) => {
    const response = await api.get('/exams', { params });
    return response.data;
  },

  // للمعلمين: الحصول على تفاصيل Exam
  getById: async (id) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },

  // للمعلمين: تحديث Exam
  update: async (id, examData) => {
    const response = await api.patch(`/exams/${id}`, examData);
    return response.data;
  },

  // للمعلمين: أرشفة Exam
  archive: async (id) => {
    const response = await api.patch(`/exams/${id}/archive`);
    return response.data;
  },

  // للمعلمين: حذف Exam
  delete: async (id) => {
    // ✅ إضافة hard=true كـ query parameter للحذف النهائي
    // الباكند يرفض الحذف بدون hard=true
    const response = await api.delete(`/exams/${id}?hard=true`);
    return response.data;
  },

  // للطلاب: الحصول على الامتحانات المتاحة
  getAvailable: async (params = {}) => {
    // استخدام /exams/available للطلاب (إذا كان يدعم state)
    // أو استخدام /exams?status=published&state=... إذا كان /exams/available لا يدعم state
    const response = await api.get('/exams/available', { params });
    return response.data;
  },

  // للطلاب: الحصول على الامتحانات المتاحة لـ Leben in Deutschland
  getLebenAvailable: async (params = {}) => {
    const response = await api.get('/exams/leben/available', { params });
    return response.data;
  },

  // للطلاب: الحصول على الامتحانات المتاحة باستخدام /exams مع filters
  getAvailableExams: async (params = {}) => {
    // استخدام /exams?status=published&state=... للطلاب
    const response = await api.get('/exams', { 
      params: {
        status: 'published',
        ...params
      }
    });
    return response.data;
  },

  // بدء محاولة امتحان جديدة
  startAttempt: async (examId) => {
    // التأكد من أن examId هو string وليس object
    const examIdString = typeof examId === 'string' 
      ? examId 
      : (examId?._id || examId?.id || String(examId));
    const response = await api.post('/attempts', { examId: examIdString });
    return response.data;
  },

  // بدء امتحان Leben in Deutschland (مع اختيار الولاية) - Endpoint خاص
  startLebenExam: async (examId, state) => {
    const examIdString = typeof examId === 'string'
      ? examId
      : (examId?._id || examId?.id || String(examId));
    const response = await api.post('/exams/leben/start', {
      examId: examIdString,
      state: state
    });
    return response.data;
  },

  // بدء محاولة امتحان Leben in Deutschland (مع اختيار الولاية) - Legacy
  startLebenAttempt: async (examId, state) => {
    const examIdString = typeof examId === 'string'
      ? examId
      : (examId?._id || examId?.id || String(examId));
    const response = await api.post('/attempts/leben/start', {
      examId: examIdString,
      state: state
    });
    return response.data;
  },

  // الحصول على تفاصيل محاولة
  getAttempt: async (attemptId, examId = null) => {
    const params = examId ? { examId } : {};
    const response = await api.get(`/attempts/${attemptId}`, { params });
    return response.data;
  },

  // حفظ إجابة سؤال واحد
  saveAnswer: async (attemptId, answerData) => {
    const response = await api.post(`/attempts/${attemptId}/answer`, answerData);
    return response.data;
  },

  // فحص إجابة سؤال واحد (يصحح ويرجع النتيجة فوراً)
  checkAnswer: async (attemptId, answerData) => {
    const response = await api.post(`/attempts/${attemptId}/check-answer`, answerData);
    return response.data;
  },

  // جلب نتيجة قسم واحد
  getSectionSummary: async (attemptId, sectionKey) => {
    const response = await api.get(`/attempts/${attemptId}/sections/${sectionKey}/summary`);
    return response.data;
  },

  // تسليم المحاولة
  submitAttempt: async (attemptId, answers = []) => {
    const response = await api.post(`/attempts/${attemptId}/submit`, {
      answers: answers, // إرسال answers كـ array
    });
    return response.data;
  },

  // الحصول على قائمة محاولات الطالب
  getMyAttempts: async (examId = null) => {
    const params = examId ? { examId } : {};
    const response = await api.get('/attempts', { params });
    return response.data;
  },

  // رفع ملف صوتي للإجابة
  uploadAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'answer.webm');
    
    const response = await api.post('/uploads/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // للطلاب: إنشاء امتحان تمرين (practice/learning mode)
  // ✅ يجب استخدام هذا endpoint للطلاب بدلاً من POST /exams
  createPractice: async (practiceData) => {
    const response = await api.post('/exams/practice', practiceData);
    return response.data;
  },

  // للطلاب: جلب أسئلة التعلم العامة (300 سؤال)
  // ✅ GET /learn/general/questions?page=1&limit=100 (حد أقصى 100)
  getGeneralLearningQuestions: async (page = 1, limit = 100) => {
    const response = await api.get('/learn/general/questions', {
      params: { page, limit }
    });
    return response.data;
  },

  // للطلاب: جلب أسئلة التعلم للولاية (10 لكل ولاية)
  // ✅ GET /learn/state/questions?state=Berlin&page=1&limit=100 (حد أقصى 100)
  getStateLearningQuestions: async (state, page = 1, limit = 100) => {
    const response = await api.get('/learn/state/questions', {
      params: { state, page, limit }
    });
    return response.data;
  },

  // للطلاب: إنشاء practice exam في وضع التعلم
  // ✅ POST /exams/practice مع mode: "general" أو "state"
  createPracticeLearning: async (mode, state = null) => {
    const body = { mode };
    if (mode === 'state' && state) {
      body.state = state;
    }
    const response = await api.post('/exams/practice', body);
    return response.data;
  },

  // ========== إدارة أقسام الامتحان (Sections) ==========

  // جلب أقسام امتحان معين
  getSections: async (examId) => {
    const response = await api.get(`/exams/${examId}/sections`);
    return response.data;
  },

  // إنشاء قسم جديد
  createSection: async (examId, data) => {
    const response = await api.post(`/exams/${examId}/sections`, data);
    return response.data;
  },

  // تحديث قسم
  updateSection: async (examId, sectionKey, data) => {
    const response = await api.patch(`/exams/${examId}/sections/${sectionKey}`, data);
    return response.data;
  },

  // حذف قسم
  deleteSection: async (examId, sectionKey) => {
    const response = await api.delete(`/exams/${examId}/sections/${sectionKey}`);
    return response.data;
  },

  // إضافة سؤال لقسم
  addQuestionToSection: async (examId, sectionKey, questionId, points) => {
    const response = await api.post(`/exams/${examId}/sections/${sectionKey}/questions`, { questionId, points });
    return response.data;
  },

  // إزالة سؤال من قسم
  removeQuestionFromSection: async (examId, sectionKey, questionId) => {
    const response = await api.delete(`/exams/${examId}/sections/${sectionKey}/questions/${questionId}`);
    return response.data;
  },

  // إعادة ترتيب أسئلة القسم
  reorderSectionQuestions: async (examId, sectionKey, questionIds) => {
    const response = await api.patch(`/exams/${examId}/sections/${sectionKey}/questions/reorder`, { questionIds });
    return response.data;
  },

  // تحديث نقاط سؤال في قسم
  updateQuestionPoints: async (examId, sectionKey, questionId, points) => {
    const response = await api.patch(
      `/exams/${examId}/sections/${sectionKey}/questions/${questionId}/points`,
      { points }
    );
    return response.data;
  },

  // إنشاء أسئلة متعددة (مع أو بدون تسجيل صوتي / فقرة قراءة)
  bulkCreateQuestions: async (examId, sectionKey, listeningClipId, questions, readingPassage, readingCards, cardsLayout, contentBlocks, readingPassageBgColor) => {
    const payload = { questions };
    if (listeningClipId) {
      payload.listeningClipId = listeningClipId;
    }
    if (readingPassage) {
      payload.readingPassage = readingPassage;
    }
    if (readingPassageBgColor) {
      payload.readingPassageBgColor = readingPassageBgColor;
    }
    if (readingCards && readingCards.length > 0) {
      payload.readingCards = readingCards;
    }
    if (cardsLayout) {
      payload.cardsLayout = cardsLayout;
    }
    if (contentBlocks && contentBlocks.length > 0) {
      payload.contentBlocks = contentBlocks;
    }
    const response = await api.post(`/exams/${examId}/sections/${sectionKey}/questions/bulk-create`, payload);
    return response.data;
  },

  // إنشاء أسئلة بدون قسم (للامتحانات بدون أقسام)
  bulkCreateQuestionsNoSection: async (examId, listeningClipId, questions, readingPassage, readingCards, cardsLayout, contentBlocks, readingPassageBgColor) => {
    const payload = { questions };
    if (listeningClipId) {
      payload.listeningClipId = listeningClipId;
    }
    if (readingPassage) {
      payload.readingPassage = readingPassage;
    }
    if (readingPassageBgColor) {
      payload.readingPassageBgColor = readingPassageBgColor;
    }
    if (readingCards && readingCards.length > 0) {
      payload.readingCards = readingCards;
    }
    if (cardsLayout) {
      payload.cardsLayout = cardsLayout;
    }
    if (contentBlocks && contentBlocks.length > 0) {
      payload.contentBlocks = contentBlocks;
    }
    const response = await api.post(`/exams/${examId}/questions/bulk-create`, payload);
    return response.data;
  },

  // ========== واجهة الطالب - أقسام الامتحان ==========

  // جلب نظرة عامة على أقسام الامتحان (للشريط الجانبي + التقدم)
  getSectionsOverview: async (examId) => {
    const response = await api.get(`/exams/${examId}/sections/overview`);
    return response.data;
  },

  // جلب أسئلة قسم معين
  getSectionQuestions: async (examId, sectionKey) => {
    const response = await api.get(`/exams/${examId}/sections/${sectionKey}/questions`);
    return response.data;
  },

  // جلب تسجيلات صوتية (clips) لقسم معين
  getSectionClips: async (examId, sectionKey) => {
    const response = await api.get(`/exams/${examId}/sections/${sectionKey}/clips`);
    return response.data;
  },
};
