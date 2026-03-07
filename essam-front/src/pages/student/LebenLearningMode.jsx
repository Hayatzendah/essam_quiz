import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';

function LebenLearningMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { learningType, state } = location.state || {}; // 'general' أو 'state'
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, [learningType, state]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      // ✅ استخدام الـ endpoints الصحيحة للتعلم مع pagination
      // ❌ لا نستخدم GET /questions - هذا مقفول على الطلاب (403)
      // ✅ الباك يحدد limit <= 100، لذلك نستخدم batches
      
      let allQuestions = [];
      let currentPage = 1;
      const limit = 100; // ✅ حد أقصى 100 لكل request
      let totalQuestions = 0;
      let hasMore = true;

      if (learningType === 'general') {
        // ✅ للأسئلة العامة (300): جلب على دفعات من 100
        console.log('📤 Fetching general learning questions with pagination (limit=100)...');
        
        while (hasMore) {
          console.log(`📤 Fetching page ${currentPage}...`);
          const response = await examsAPI.getGeneralLearningQuestions(currentPage, limit);
          
          // ✅ حفظ total من أول response
          if (currentPage === 1) {
            totalQuestions = response.total || 0;
            console.log(`✅ Total general questions: ${totalQuestions}`);
          }
          
          // ✅ إضافة items من هذه الصفحة
          if (response.items && Array.isArray(response.items)) {
            allQuestions = [...allQuestions, ...response.items];
            console.log(`✅ Loaded ${response.items.length} questions from page ${currentPage} (Total so far: ${allQuestions.length})`);
            
            // ✅ التحقق إذا كان هناك المزيد من الصفحات
            hasMore = response.items.length === limit && allQuestions.length < totalQuestions;
            currentPage++;
          } else {
            hasMore = false;
          }
        }
      } else if (learningType === 'state' && state) {
        // ✅ لأسئلة الولاية (10 لكل ولاية): جلب على دفعات من 100
        console.log(`📤 Fetching state learning questions for ${state} with pagination (limit=100)...`);
        
        while (hasMore) {
          console.log(`📤 Fetching page ${currentPage} for state ${state}...`);
          const response = await examsAPI.getStateLearningQuestions(state, currentPage, limit);
          
          // ✅ حفظ total من أول response
          if (currentPage === 1) {
            totalQuestions = response.total || 0;
            console.log(`✅ Total state questions for ${state}: ${totalQuestions}`);
          }
          
          // ✅ إضافة items من هذه الصفحة
          if (response.items && Array.isArray(response.items)) {
            allQuestions = [...allQuestions, ...response.items];
            console.log(`✅ Loaded ${response.items.length} questions from page ${currentPage} (Total so far: ${allQuestions.length})`);
            
            // ✅ التحقق إذا كان هناك المزيد من الصفحات
            hasMore = response.items.length === limit && allQuestions.length < totalQuestions;
            currentPage++;
          } else {
            hasMore = false;
          }
        }
      } else {
        setError('نوع التعلم غير صحيح');
        setLoading(false);
        return;
      }

      console.log(`✅ Finished loading. Total questions: ${allQuestions.length}`);

      // ✅ تحويل items إلى format قابل للعرض (إذا كانت تحتوي على question object)
      const formattedQuestions = allQuestions.map((item) => {
        // إذا كان item يحتوي على question object كامل
        if (item.question) {
          return item.question;
        }
        // إذا كان item هو question object مباشرة
        return item;
      });

      if (formattedQuestions.length === 0) {
        setError('لا توجد أسئلة متاحة');
        console.error('❌ No questions loaded');
      } else {
        console.log(`✅ Successfully loaded ${formattedQuestions.length} questions`);
        setQuestions(formattedQuestions);
        setCurrentIndex(0);
        setShowAnswer(false);
        setSelectedOption(null);
      }
    } catch (err) {
      console.error('❌ Error loading questions:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Error data:', err.response?.data);
      
      // ✅ معالجة خطأ 403 بشكل خاص
      if (err.response?.status === 403) {
        setError('❌ خطأ 403: ليس لديك صلاحية للوصول. تأكد من أنك تستخدم endpoints التعلم الصحيحة');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'خطأ في البيانات المرسلة. تأكد من أن limit <= 100');
      } else {
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل الأسئلة');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setSelectedOption(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
      setSelectedOption(null);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleOptionClick = (optionIndex) => {
    if (!showAnswer) {
      setSelectedOption(optionIndex);
    }
  };

  const getCorrectAnswerIndex = () => {
    const question = questions[currentIndex];
    if (!question || !question.options) return null;
    
    return question.options.findIndex(opt => opt.isCorrect === true);
  };

  const getCorrectAnswerText = () => {
    const question = questions[currentIndex];
    if (!question) return '';

    if (question.qType === 'mcq' || question.qType === 'MCQ') {
      const correctOption = question.options?.find(opt => opt.isCorrect);
      return correctOption?.text || '';
    } else if (question.qType === 'true_false' || question.qType === 'TRUE_FALSE') {
      const correctOption = question.options?.find(opt => opt.isCorrect);
      return correctOption?.text || '';
    } else if (question.qType === 'fill' || question.qType === 'FILL') {
      return question.fillExact || question.correctAnswer || '';
    } else if (question.qType === 'match' || question.qType === 'MATCH') {
      return question.answerKeyMatch || '';
    }
    
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-red-600 mb-4"></div>
          <p className="text-slate-600">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <p className="text-red-600 text-center mb-4">{error || 'لا توجد أسئلة متاحة'}</p>
            <button
              onClick={() => navigate('/student/leben')}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const correctAnswerIndex = getCorrectAnswerIndex();
  const correctAnswerText = getCorrectAnswerText();
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // ✅ تحريك النقاط من البداية إلى النهاية
  const formatQuestionText = (text) => {
    if (!text) return '';
    // إذا كان النص يبدأ بنقاط، ننقلها للنهاية
    if (text.trim().startsWith('...')) {
      return text.trim().replace(/^\.\.\.\s*/, '') + ' ...';
    }
    return text;
  };

  const questionText = formatQuestionText(currentQuestion.prompt || currentQuestion.text || 'السؤال');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/student/leben')}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            ← العودة
          </button>
          <div className="text-sm text-slate-600">
            {learningType === 'general' ? 'تعلم الأسئلة العامة' : `تعلم أسئلة ${state}`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              السؤال {currentIndex + 1} من {questions.length}
            </span>
            <span className="text-sm text-slate-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          {/* Question Text */}
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-left" dir="ltr">
            {questionText}
          </h2>

          {/* Question Images - تحت السؤال */}
          {currentQuestion.images && Array.isArray(currentQuestion.images) && currentQuestion.images.length > 0 && (
            <>
              {/* ✅ إذا كانت صورة واحدة فقط: عرضها بشكل منفصل تحت السؤال */}
              {currentQuestion.images.length === 1 ? (
                <div className="mb-6 max-w-2xl mx-auto">
                  <div className="w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-4">
                    <img
                      src={currentQuestion.images[0].url}
                      alt={currentQuestion.images[0].description || 'Question Image'}
                      className="max-w-full max-h-96 rounded-lg object-contain"
                    />
                  </div>
                  {currentQuestion.images[0].description && (
                    <p className="text-xs text-slate-600 mt-2 text-center font-medium">
                      {currentQuestion.images[0].description}
                    </p>
                  )}
                </div>
              ) : (
                /* ✅ عرض الصور من اليسار لليمين: Bild 1، ثم 2، ثم 3، ثم 4 */
                <div className="grid grid-cols-4 gap-4 mb-6 max-w-4xl mx-auto">
                  {currentQuestion.images.map((img, imgIndex) => (
                    <div key={imgIndex} className="flex flex-col">
                      <div className="w-full h-40 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
                        <img
                          src={img.url}
                          alt={img.description || `Bild ${imgIndex + 1}`}
                          className="max-w-full max-h-full rounded-lg object-contain"
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-2 text-center font-medium">
                        {img.description || `Bild ${imgIndex + 1}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {/* ✅ Fallback: إذا لم تكن هناك images array، نعرض media.url (للتوافق مع الكود القديم) */}
          {(!currentQuestion.images || !Array.isArray(currentQuestion.images) || currentQuestion.images.length === 0) && currentQuestion.media?.url && (
            <div className="mb-6 max-w-2xl mx-auto">
              <div className="w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-4">
                <img
                  src={currentQuestion.media.url}
                  alt="Question"
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              </div>
            </div>
          )}

          {/* Options */}
          {currentQuestion.qType === 'mcq' || currentQuestion.qType === 'MCQ' ? (
            <div className="space-y-3 mb-6">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = option.isCorrect;
                const showCorrect = showAnswer && isCorrect;
                const showIncorrect = showAnswer && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(index)}
                    disabled={showAnswer}
                    className={`w-full text-left p-4 rounded-lg border-2 transition text-base ${
                      showCorrect
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : showIncorrect
                        ? 'bg-red-50 border-red-500 text-red-900'
                        : isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                    } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                    dir="ltr"
                  >
                    <div className="flex items-center">
                      <span className="text-left flex-1" dir="ltr">{option.text}</span>
                      {showCorrect && <span className="text-green-600 ml-auto">✓ صحيح</span>}
                      {showIncorrect && <span className="text-red-600 ml-auto">✗ خطأ</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : currentQuestion.qType === 'true_false' || currentQuestion.qType === 'TRUE_FALSE' ? (
            <div className="space-y-3 mb-6">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = option.isCorrect;
                const showCorrect = showAnswer && isCorrect;
                const showIncorrect = showAnswer && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(index)}
                    disabled={showAnswer}
                    className={`w-full text-left p-4 rounded-lg border-2 transition text-base ${
                      showCorrect
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : showIncorrect
                        ? 'bg-red-50 border-red-500 text-red-900'
                        : isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                    } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                    dir="ltr"
                  >
                    <div className="flex items-center">
                      <span className="text-left flex-1" dir="ltr">{option.text}</span>
                      {showCorrect && <span className="text-green-600 ml-auto">✓ صحيح</span>}
                      {showIncorrect && <span className="text-red-600 ml-auto">✗ خطأ</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-slate-600 text-sm mb-2">نوع السؤال: {currentQuestion.qType}</p>
              {showAnswer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-900 font-medium">الإجابة الصحيحة: {correctAnswerText}</p>
                </div>
              )}
            </div>
          )}

          {/* Show Answer Button */}
          {!showAnswer && (
            <button
              onClick={handleShowAnswer}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-medium mb-4"
            >
              إظهار الإجابة الصحيحة
            </button>
          )}

          {/* Explanation */}
          {showAnswer && currentQuestion.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">شرح الإجابة:</h3>
              <p className="text-blue-800">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Correct Answer Display */}
          {showAnswer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900 font-medium">
                ✓ الإجابة الصحيحة: {correctAnswerText}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              currentIndex === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-600 hover:bg-slate-700 text-white'
            }`}
          >
            ← السابق
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              currentIndex === questions.length - 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            التالي →
          </button>
        </div>
      </div>
    </div>
  );
}

export default LebenLearningMode;