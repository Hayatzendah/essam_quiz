// src/pages/grammar/GrammarExercisePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrammarTopic } from '../../services/api';
import api from '../../services/api';

export default function GrammarExercisePage() {
  const { level, topicSlug } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [attemptItems, setAttemptItems] = useState([]);
  const [answers, setAnswers] = useState([]); // تغيير من {} إلى [] لأننا نستخدم find()
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // منع التمرير التلقائي: فتح الصفحة من الأعلى وعدم النزول للأسفل عند بدء التمرين
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, [level, topicSlug]);

  // بعد انتهاء التحميل وعرض الأسئلة، إبقاء الموضع عند الأعلى (التمرير يدوي فقط)
  useEffect(() => {
    if (!loading && attemptItems.length > 0) {
      const t = setTimeout(() => window.scrollTo(0, 0), 0);
      return () => clearTimeout(t);
    }
  }, [loading, attemptItems.length]);

  useEffect(() => {
    async function initializeExercise() {
      try {
        setLoading(true);
        setError('');

        // 1. جلب معلومات الموضوع
        const topicData = await getGrammarTopic(topicSlug, level);
        setTopic(topicData);
        console.log('📚 Full Topic Response:', topicData);
        console.log('📚 Topic keys:', Object.keys(topicData || {}));
        console.log('🔍 Topic examId:', topicData?.examId);
        console.log('🔍 Topic exam:', topicData?.exam);
        console.log('🔍 All topic fields:', JSON.stringify(topicData, null, 2));

        // 2. التحقق من وجود examId في الموضوع
        if (!topicData.examId) {
          setError('عذراً، التمرين لهذا الموضوع قيد الإعداد من قبل المدرس. يرجى المحاولة لاحقاً.');
          setLoading(false);
          return;
        }

        // 3. بدء محاولة على الامتحان الموجود - استخدام POST /exams/:examId/attempts
        // ⚠️ shuffle: false لتثبيت ترتيب الأسئلة (لا يتغير من محاولة لأخرى)
        console.log('📤 Starting attempt for exam:', topicData.examId);

        const attemptRes = await api.post(`/exams/${topicData.examId}/attempts`, {
          shuffle: false,
          shuffleOptions: false
        });

        console.log('✅ Attempt started successfully:', attemptRes.data);
        console.log('🔍 Attempt Response Full Object:', attemptRes.data);
        console.log('🔍 Attempt Response Keys:', Object.keys(attemptRes.data || {}));
        console.log('🔍 Attempt Response _id:', attemptRes.data?._id);
        console.log('🔍 Attempt Response id:', attemptRes.data?.id);
        console.log('🔍 Attempt Response Details:', {
          hasData: !!attemptRes.data,
          attemptId_underscore: attemptRes.data?._id,
          attemptId_noUnderscore: attemptRes.data?.id,
          hasItems: !!attemptRes.data?.items,
          itemsLength: attemptRes.data?.items?.length || 0
        });

        // ⚠️ الـ Backend بيرجع attemptId (مش _id)
        const receivedAttemptId = attemptRes.data?.attemptId || attemptRes.data?._id;
        const receivedItems = attemptRes.data?.items || [];

        console.log('💾 Raw items:', receivedItems);
        console.log('💾 First item structure:', JSON.stringify(receivedItems[0], null, 2));

        // تطبيع items - المهم: استخدام questionSnapshot.options مباشرة
        const formattedItems = receivedItems.map((item, idx) => {
          const snap = item.questionSnapshot || {};
          
          // قراءة البيانات الأساسية
          const questionId = snap.questionId || item.questionId;
          const qType = snap.qType || item.qType || 'mcq';
          const prompt = item.promptSnapshot || snap.prompt || item.prompt || '';
          
          // بناء options array - المهم: كل option يحتوي على id حقيقي من الباك
          let options = [];
          
          // الطريقة المفضلة: استخدام questionSnapshot.options مباشرة - render كـ strings
          if (snap.options && Array.isArray(snap.options) && snap.options.length > 0) {
            options = snap.options.map((opt) => {
              // عرض كـ string مباشرة
              if (typeof opt === 'string') {
                return opt;
              }
              return opt?.text ?? opt?.label ?? opt ?? '';
            });
          }
          // Fallback: استخدام options مباشرة من item (إذا كانت موجودة)
          else if (item.options && Array.isArray(item.options) && item.options.length > 0) {
            options = item.options.map((opt) => {
              if (typeof opt === 'string') {
                return opt;
              }
              return opt?.text ?? opt?.label ?? opt ?? '';
            });
          }
          // Fallback: استخدام optionsText و optionOrder
          else if (item.optionsText && item.optionOrder) {
            options = item.optionOrder.map((originalIdx) => {
              const optionText = item.optionsText[originalIdx] || item.optionsText[String(originalIdx)];
              return typeof optionText === 'string' ? optionText : (optionText?.text || optionText || '');
            });
          }
          // Fallback آخر: استخدام optionsText فقط
          else if (item.optionsText && typeof item.optionsText === 'object') {
            options = Object.values(item.optionsText).map((opt) => {
              return typeof opt === 'string' ? opt : (opt?.text || opt || '');
            });
          }
          
          // Fallback خاص لأسئلة True/False: إذا لم نجد options، ننشئها افتراضياً
          if (options.length === 0 && (qType === 'true_false' || qType === 'TRUE_FALSE')) {
            console.warn(`⚠️ No options found for True/False question ${idx}, creating default options`);
            // إنشاء options افتراضية لـ True/False
            options = ['صح', 'خطأ'];
          }
          
          // Log للتحقق
          if (options.length === 0 && qType === 'mcq') {
            console.warn(`⚠️ No options found for MCQ item ${idx}:`, {
              qType,
              hasSnapOptions: !!snap.options,
              snapOptionsLength: snap.options?.length,
              hasItemOptions: !!item.options,
              itemOptionsLength: item.options?.length,
              hasOptionsText: !!item.optionsText,
              hasOptionOrder: !!item.optionOrder,
              item: item,
              snap: snap
            });
          }

          console.log(`Item ${idx} - Formatted:`, { 
            questionId,
            prompt, 
            qType, 
            options,
            optionsWithIds: options.map(opt => ({ id: opt.id, text: opt.text }))
          });

          return {
            id: item._id,  // استخدام attempt item _id فقط
            questionId: questionId,
            points: item.points,
            // البيانات من الحقول الصحيحة
            text: prompt,
            prompt: prompt,
            qType: qType,
            options: options, // options الآن array of { id, text }
            // حفظ البيانات الأصلية للوصول إليها عند الإرسال
            _rawItem: item, // حفظ item الأصلي للوصول إلى questionSnapshot
          };
        });
        
        // 🔍 Log للتحقق من أن كل option له id طويل (ObjectId)
        console.log('💾 Normalized items:', formattedItems);
        formattedItems.forEach((item, idx) => {
          console.log(`Item ${idx} options IDs:`, item.options.map(opt => opt.id));
        });

        console.log('💾 Formatted items:', formattedItems);
        console.log('💾 Setting state:', {
          attemptId: receivedAttemptId,
          itemsCount: formattedItems.length
        });

        setAttemptId(receivedAttemptId);
        setAttemptItems(formattedItems);

        console.log('✅ State should be updated now');
      } catch (err) {
        console.error('❌ Exercise initialization error:', err);
        console.error('❌ Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers
          }
        });

        // معالجة الأخطاء حسب النوع
        if (err.response?.status === 401) {
          // 401 = Token منتهي أو غير صالح
          console.error('🔒 401 Unauthorized - Token منتهي أو غير صالح');
          setError('انتهت صلاحية جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');

          // حذف tokens القديمة
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');

          // إعادة التوجيه للـ login
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (err.response?.status === 403) {
          // 403 = Forbidden - ما عندك صلاحية (لكن مسجل دخول)
          console.error('🚫 403 Forbidden - ليس لديك صلاحية لإنشاء امتحانات');
          console.error('💡 Hint: يبدو أن حسابك كطالب لا يملك صلاحية إنشاء الامتحانات');
          setError('عذراً، لا يمكنك إنشاء تمارين كطالب. تواصل مع المدرس للحصول على الصلاحيات المطلوبة.');
        } else if (err.response?.status === 400) {
          // 400 = Bad Request - خطأ في البيانات المرسلة
          console.error('⚠️ 400 Bad Request - خطأ في البيانات المرسلة');
          console.error('📋 Response data:', err.response?.data);
          setError(`خطأ في البيانات: ${err.response?.data?.message || err.response?.data?.error || 'تحقق من الـ Console'}`);
        } else {
          setError('حدث خطأ أثناء تحميل التمرين. جرّبي مرة أخرى.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (level && topicSlug) {
      initializeExercise();
    }
  }, [level, topicSlug, navigate]);

  // Debug: تتبع تغييرات attemptId و attemptItems
  useEffect(() => {
    console.log('🔄 State changed:', {
      attemptId: attemptId,
      attemptItemsLength: attemptItems.length,
      hasAttemptId: !!attemptId,
      hasAttemptItems: attemptItems.length > 0
    });
  }, [attemptId, attemptItems]);

  // دالة عامة واحدة لجميع الأسئلة - تستقبل questionId و optionIndex
  const setOptionAnswer = (questionId, optionIndex) => {
    // التأكد من أن optionIndex موجود وصالح
    if (optionIndex === undefined || optionIndex === null) {
      console.warn('⚠️ Invalid optionIndex', { questionId, optionIndex });
      return;
    }

    console.log('🎯 setOptionAnswer called:', { questionId, optionIndex });

    setAnswers((prev) => {
      const next = [...prev];
      const idx = next.findIndex(a => a.questionId === questionId);

      const updated = { 
        questionId, 
        selectedOptionIndex: optionIndex // حفظ index بدلاً من id
      };

      if (idx === -1) {
        next.push(updated);
        console.log('✅ Added new answer:', updated);
      } else {
        next[idx] = updated;
        console.log('✅ Updated answer at index', idx, ':', updated);
      }

      console.log('📦 Updated answers array:', next);
      return next;
    });
  };
  
  // دالة خاصة لـ True/False - تستخدم index مباشرة
  const handleTrueFalseClick = (questionId, value) => {
    console.log('🎯 handleTrueFalseClick called:', { questionId, value });
    
    const item = attemptItems.find(i => i.questionId === questionId);
    if (!item) {
      console.warn('⚠️ Item not found for questionId:', questionId, 'Available items:', attemptItems.map(i => i.questionId));
      return;
    }

    console.log('📋 Found item:', { questionId: item.questionId, options: item.options, optionsCount: item.options?.length });

    // استخدام index مباشرة: 0 لـ true (صح), 1 لـ false (خطأ)
    const optionIndex = value === 'true' ? 0 : 1;
    console.log('✅ Using option index:', optionIndex);
    setOptionAnswer(questionId, optionIndex);
  };

  // دالة مساعدة لتحديث الإجابة بناءً على questionId
  const updateAnswerForQuestion = (questionId, newAnswer) => {
    setAnswers((prev) => {
      console.log('📦 Previous answers:', prev);
      // البحث عن الإجابة الموجودة لنفس السؤال
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      const next = [...prev];
      
      if (existingIndex === -1) {
        // إضافة إجابة جديدة (أول مرة يجاوب السؤال)
        console.log(`✅ Adding new answer for questionId: ${questionId}`);
        next.push(newAnswer);
      } else {
        // تحديث الإجابة الموجودة (بدل ما نضيف واحد جديد)
        console.log(`✅ Updating existing answer at index ${existingIndex} for questionId: ${questionId}`);
        next[existingIndex] = newAnswer;
      }
      
      // التحقق من عدم وجود عناصر مكررة
      const duplicateCheck = next.filter(a => a.questionId === questionId);
      if (duplicateCheck.length > 1) {
        console.error(`⚠️ WARNING: Found ${duplicateCheck.length} answers for questionId: ${questionId}`, duplicateCheck);
      }
      
      console.log('📦 Updated answers:', next);
      return next;
    });
  };

  const handleAnswer = async (itemIndex, answer) => {
    console.log('🎯 handleAnswer called with:', { itemIndex, answer, answerType: typeof answer });

    // الحصول على السؤال
    const item = attemptItems[itemIndex];
    if (!item) {
      console.error(`⚠️ Item not found at index ${itemIndex}`);
      return;
    }

    const questionId = item.questionId || item.id;
    console.log('📝 Question ID:', questionId, 'from item:', { questionId: item.questionId, id: item.id });

    // دالة مساعدة لتحديث الإجابات بناءً على questionId (للأنواع الأخرى)
    const updateAnswer = (newAnswer) => {
      updateAnswerForQuestion(questionId, newAnswer);
    };

    // إذا كانت الإجابة boolean (true/false)، نحفظها مع questionId
    if (typeof answer === 'boolean') {
      console.log('📦 Saving true/false answer:', { questionId, answer });
      // true = index 0, false = index 1
      updateAnswer({
        questionId: questionId,
        selectedOptionIndex: answer ? 0 : 1,
      });
      return;
    }

    // إذا كانت الإجابة number (index للخيار في MCQ)
    if (typeof answer === 'number') {
      const optionIndex = answer;
      console.log(`✅ Selected option index for question ${itemIndex + 1}:`, optionIndex);
      // حفظ الإجابة مع questionId و index
      updateAnswer({
        questionId: questionId,
        selectedOptionIndex: optionIndex,
      });
    }

    // إذا كانت الإجابة string (fill in blank)
    if (typeof answer === 'string') {
      updateAnswer({
        questionId: questionId,
        textAnswer: answer,
      });
    }
  };

  // دالة للتحقق من أن السؤال مجاوب بناءً على نوعه
  const isAnswered = (question, answer) => {
    const qType = question.qType;

    console.log('🔍 isAnswered check:', {
      questionId: question.questionId,
      qType,
      answer,
      hasAnswer: !!answer,
      selectedOptionIndex: answer?.selectedOptionIndex,
      textAnswer: answer?.textAnswer
    });

    // أسئلة الاختيار (صح/غلط + اختيار واحد + اختيار متعدد)
    if (qType === 'true_false' || qType === 'mcq' || qType === 'multi_select') {
      // التحقق من selectedOptionIndex
      const hasOptionIndex = answer?.selectedOptionIndex !== undefined && answer?.selectedOptionIndex !== null;
      console.log('  → MCQ/TrueFalse check:', { hasOptionIndex, isAnswered: hasOptionIndex });
      return hasOptionIndex;
    }

    // أسئلة املأ الفراغ
    if (qType === 'fill' || qType === 'fill_in_blank') {
      const hasTextAnswer = !!(answer?.textAnswer && answer.textAnswer.trim().length > 0);
      console.log('  → Fill check:', hasTextAnswer);
      return hasTextAnswer;
    }

    // أي نوع تاني اعتبره مجاوَب افتراضيًا
    console.log('  → Default: true');
    return true;
  };

  const handleSubmit = async () => {
    // Guard: منع الاستدعاء المتكرر
    if (submitting) {
      console.warn('⚠️ Submit already in progress, ignoring duplicate call');
      return;
    }

    if (!attemptId) {
      console.error('❌ No attemptId found');
      return;
    }

    console.log('📋 questions (attemptItems):', attemptItems);
    console.log('📋 answers:', answers);

    // التحقق من أن جميع الأسئلة محلولة
    const unansweredNumbers = [];
    attemptItems.forEach((item, index) => {
      // استخدام questionId أو id كـ fallback
      const itemQuestionId = item.questionId || item.id;
      
      // دور على الإجابة اللي ليها نفس questionId
      const answer = answers.find((a) => {
        const answerQuestionId = a.questionId;
        const matches = answerQuestionId === itemQuestionId;
        if (!matches && index < 3) { // فقط للأسئلة الثلاثة الأولى
          console.log(`  🔍 QuestionId mismatch:`, {
            answerQuestionId,
            itemQuestionId,
            match: matches
          });
        }
        return matches;
      });
      
      console.log(`\n📝 Checking question ${index + 1}:`, {
        itemQuestionId,
        itemQuestionIdType: typeof itemQuestionId,
        itemId: item.id,
        qType: item.qType,
        foundAnswer: !!answer,
        answer,
        allAnswerQuestionIds: answers.map(a => a.questionId)
      });

      if (!isAnswered(item, answer)) {
        // خزّن رقم السؤال (1, 2, 3...)
        console.log(`  ❌ Question ${index + 1} is NOT answered`);
        unansweredNumbers.push(index + 1);
      } else {
        console.log(`  ✅ Question ${index + 1} IS answered`);
      }
    });

    if (unansweredNumbers.length > 0) {
      alert(
        `⚠️ يرجى الإجابة على جميع الأسئلة قبل التسليم.\n` +
        `الأسئلة غير المجاوبة: ${unansweredNumbers.join(', ')}`
      );
      return; // ما نبعتش للباك
    }

    try {
      setSubmitting(true);

      // 🔍 Log قبل الإرسال - مهم جداً للتحقق
      console.log('answers before submit', answers);
      console.log('📦 Full answers state before submit:', answers);
      console.log('📋 Attempt items count:', attemptItems.length);

      // تحضير الإجابات بصيغة Backend المطلوبة
      const answersArray = attemptItems.map((item) => {
        // البحث عن الإجابة باستخدام questionId
        const userAnswer = answers.find((a) => a.questionId === item.questionId);

        // الحصول على selectedOptionIndex
        const selectedOptionIndex = userAnswer?.selectedOptionIndex;
        
        // الحصول على textValue (للأسئلة النصية)
        const textValue = userAnswer?.textAnswer;

        // بناء كائن الإجابة حسب نوع السؤال
        const answerObj = {
          questionId: item.questionId,
        };

        // fill_blank: إرسال answerText فقط (بدون selectedOptionIndexes)
        if (item.qType === "fill" || item.qType === "fill_in_blank") {
          answerObj.answerText = textValue;
          // لا نرسل selectedOptionIndexes لأسئلة fill_blank
        } else {
          // MCQ/TrueFalse وغيرها: إرسال selectedOptionIndexes فقط (بدون answerText)
          // لـ True/False: 0 = صح (true), 1 = خطأ (false)
          answerObj.selectedOptionIndexes = selectedOptionIndex !== undefined && selectedOptionIndex !== null ? [selectedOptionIndex] : [];
          // لا نرسل answerText لأسئلة MCQ/TrueFalse
        }

        return answerObj;
      });

      console.log('📤 Sending submit request to:', `/attempts/${attemptId}/submit`);
      console.log('📋 answersArray after building:', answersArray);
      console.log('📋 answersArray length:', answersArray.length);

      // 🔍 التحقق من أن payload غير فارغ
      const payload = { answers: answersArray };
      console.log('SUBMIT PAYLOAD', payload);
      console.log('📊 Payload validation:', {
        answersLength: payload.answers.length,
        answersStateLength: answers.length,
        attemptItemsLength: attemptItems.length,
        hasAnswers: payload.answers.length > 0
      });

      // التحقق من أن answers غير فارغ قبل الإرسال
      if (payload.answers.length === 0) {
        console.error('❌ ERROR: Payload is empty! answers array is empty.');
        alert('⚠️ لا توجد إجابات للإرسال. يرجى التأكد من الإجابة على جميع الأسئلة.');
        setSubmitting(false);
        return;
      }

      const resultRes = await api.post(`/attempts/${attemptId}/submit`, payload);

      console.log('✅ Attempt submitted:', resultRes.data);
      console.log('📊 Result Details:', {
        totalAutoScore: resultRes.data?.totalAutoScore,
        score: resultRes.data?.score,
        totalQuestions: resultRes.data?.totalQuestions,
        percentage: resultRes.data?.percentage,
        items: resultRes.data?.items,
        itemsLength: resultRes.data?.items?.length,
        fullResponse: resultRes.data
      });

      // طباعة كل سؤال مع نتيجته
      console.log('📝 تفاصيل كل سؤال:');
      resultRes.data?.items?.forEach((item, idx) => {
        const isCorrect = (item.autoScore ?? 0) >= (item.points ?? 1);
        console.log(`سؤال ${idx + 1}:`, {
          questionId: item.questionId,
          autoScore: item.autoScore,
          points: item.points,
          isCorrect: isCorrect, // حساب صحيح بناءً على autoScore و points
          studentAnswer: item.studentAnswerBoolean ?? item.studentAnswerText ?? item.studentAnswerIndexes,
          correctAnswer: item.correctAnswerBoolean ?? item.correctAnswerText ?? item.correctAnswerIndexes
        });
      });

      // استخدام البيانات من response الـ submit (التي تحتوي على autoScore و points الصحيحة)
      setResults(resultRes.data);
      
      // تحديث attemptItems بالبيانات الجديدة من response (إذا كانت موجودة)
      if (resultRes.data?.items && Array.isArray(resultRes.data.items)) {
        const updatedItems = resultRes.data.items.map((resultItem) => {
          // البحث عن attemptItem المقابل
          const originalItem = attemptItems.find(item => item.questionId === resultItem.questionId);
          return {
            ...originalItem,
            ...resultItem, // إضافة البيانات الجديدة (autoScore, points, etc.)
          };
        });
        setAttemptItems(updatedItems);
      }

      // إعادة تعيين submitting بعد النجاح
      setSubmitting(false);

      // التحقق من status - إذا كان submitted، ننقل المستخدم لصفحة النتائج
      if (resultRes.data?.status === 'submitted' || resultRes.data?.status === 'completed') {
        console.log('✅ Attempt successfully submitted, status:', resultRes.data?.status);
        // يمكن إضافة redirect هنا إذا لزم الأمر
        // navigate(`/grammar/${slug}/${level}/results/${attemptId}`);
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
      
      // معالجة خطأ 403 - Attempt already submitted
      if (err.response?.status === 403) {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Attempt is already submitted';
        console.error('❌ 403 Forbidden:', errorMessage);
        alert(`⚠️ ${errorMessage}\n\nيرجى إنشاء محاولة جديدة.`);
        
        // إعادة تعيين attemptId لإجبار إنشاء attempt جديد
        setAttemptId(null);
        setAttemptItems([]);
        setAnswers([]);
        
        // يمكن إضافة redirect هنا إذا لزم الأمر
        // navigate(`/grammar/${slug}/${level}`);
      } else {
        // معالجة أخطاء أخرى
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'حدث خطأ أثناء إرسال الإجابات';
        alert(`❌ ${errorMessage}`);
      }
      
      setSubmitting(false);
    }
  };


  // دالة لعرض السؤال مع inline input للفراغ
  const renderFillQuestion = (text, value, onChange) => {
    if (!text) return null;

    // البحث عن الفراغ ___ في النص
    const blankPattern = /_{2,}/; // يبحث عن _ متكررة (مثل __ أو ___ أو ____)

    if (!blankPattern.test(text)) {
      // إذا ما في فراغ، نعرض النص عادي
      return <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>{text}</span>;
    }

    // تقسيم النص عند الفراغ
    const parts = text.split(blankPattern);

    return (
      <span style={{ display: 'inline', fontSize: '1.125rem', fontWeight: '600' }}>
        <span>{parts[0]}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="inline-input-fill"
          style={{
            display: 'inline-block',
            border: 'none',
            borderBottom: '2px solid #e63946',
            padding: '2px 8px',
            margin: '0 4px',
            fontSize: 'inherit',
            fontWeight: '600',
            lineHeight: 'inherit',
            minWidth: '80px',
            maxWidth: '200px',
            width: `${Math.max(80, (value.length + 1) * 14)}px`,
            backgroundColor: 'transparent',
            outline: 'none',
            textAlign: 'center',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = '#dc2626';
            e.target.style.borderBottomWidth = '3px';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = '#e63946';
            e.target.style.borderBottomWidth = '2px';
          }}
          autoFocus
        />
        <span>{parts[1]}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-slate-500">جاري تحضير التمرين…</div>
        </div>
      </div>
    );
  }

  // التأكد من أن attemptId موجود قبل عرض الأسئلة
  // ⚠️ فقط نعرض الخطأ إذا خلص الـ loading وما في error وما في attemptId
  if (!loading && !error && !attemptId && attemptItems.length === 0) {
    console.warn('⚠️ Showing error: No attemptId after loading finished');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 mb-4 max-w-md">
            ⚠️ لم يتم تحميل التمرين بشكل صحيح. يرجى المحاولة مرة أخرى.
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  // عرض النتائج
  if (results) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-4">
              🎉 انتهى التمرين!
            </h1>

            <div className="mb-6">
              <div className="text-lg font-semibold text-slate-900">
                النتيجة: {results.totalAutoScore ?? results.finalScore ?? 0} / {results.totalMaxScore ?? attemptItems.length}
              </div>
              <div className="text-sm text-slate-600">
                النسبة: {
                  results.totalMaxScore > 0
                    ? Math.round((results.totalAutoScore / results.totalMaxScore) * 100)
                    : 0
                }%
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {attemptItems.map((attemptItem, idx) => {
                const resultItem = results.items?.find(r => r.questionId === attemptItem.questionId);
                
                // حساب isCorrect بناءً على autoScore و points (المنطق الصحيح)
                const autoScore = resultItem?.autoScore ?? attemptItem?.autoScore ?? 0;
                const points = resultItem?.points ?? attemptItem?.points ?? 1;
                const isCorrect = autoScore >= points;
                
                console.log(`📊 Question ${idx + 1} result:`, {
                  questionId: attemptItem.questionId,
                  autoScore,
                  points,
                  isCorrect,
                  resultItem: resultItem
                });
                
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">
                        سؤال {idx + 1}
                      </span>
                      <span className="text-xs">
                        {isCorrect ? '✅ صحيح' : '❌ خطأ'}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({autoScore} / {points} نقطة)
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      {attemptItem.prompt || attemptItem.text || 'سؤال'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/grammatik/${level}/${topicSlug}`)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"
              >
                رجوع للموضوع
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                إعادة التمرين
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // عرض الأسئلة - التأكد من وجود البيانات المطلوبة
  if (!attemptId || attemptItems.length === 0) {
    console.warn('⚠️ Cannot render questions - missing data:', {
      hasAttemptId: !!attemptId,
      attemptItemsLength: attemptItems.length
    });
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-slate-500">جاري تحميل الأسئلة…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* الشريط العلوي */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← رجوع
          </button>
          <span className="text-xs font-semibold text-red-600">
            {topic?.title}
          </span>
        </div>

        {/* عنوان التمرين */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            تمارين {topic?.title}
          </h1>
          <p className="text-sm text-slate-600">
            {attemptItems.length} سؤال • أجيبي على جميع الأسئلة ثم اضغطي "إرسال الإجابات"
          </p>
        </div>

        {/* عرض كل الأسئلة */}
        <div className="space-y-6 mb-6">
          {attemptItems.map((item, itemIndex) => {
            console.log(`📝 Item ${itemIndex}:`, item);

            return (
              <div key={itemIndex} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-left">
                {/* رقم السؤال */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-red-600 text-white rounded">
                    سؤال {itemIndex + 1}
                  </span>
                  {item.qType && (
                    <span className="text-[10px] text-slate-400">
                      {item.qType === 'mcq' && 'اختيار من متعدد'}
                      {item.qType === 'fill' && 'املأ الفراغ'}
                      {item.qType === 'true_false' && 'صح أو خطأ'}
                    </span>
                  )}
                </div>

                {/* MCQ */}
                {item.qType === 'mcq' && (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3" dir="ltr" style={{ textAlign: 'left', fontFamily: 'inherit' }}>
                      {item.prompt || item.text || 'نص السؤال'}
                    </h3>
                    <div className="space-y-2">
                      {item.options && item.options.length > 0 ? (
                        item.options.map((opt, optIndex) => {
                          // opt الآن string مباشرة
                          const optionText = typeof opt === 'string' ? opt : (opt?.text || opt?.label || opt || '');
                          const questionId = item.questionId || item.id;
                          
                          // البحث عن الإجابة باستخدام questionId
                          const answer = answers.find((a) => a.questionId === questionId);
                          const isSelected = answer?.selectedOptionIndex === optIndex;
                          
                          return (
                            <label
                              key={optIndex}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition cursor-pointer ${
                                isSelected
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-slate-50 border-slate-200 hover:border-red-500'
                              }`}
                              style={{ direction: 'ltr', textAlign: 'left' }}
                            >
                              <input
                                type="radio"
                                name={questionId}
                                value={optIndex}
                                checked={isSelected}
                                onChange={() => setOptionAnswer(questionId, optIndex)}
                                className="hidden"
                              />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'border-red-600'
                                  : 'border-slate-300'
                              }`}>
                                {isSelected && (
                                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                )}
                              </div>
                              <span style={{ textAlign: 'left' }}>{optionText}</span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400">لا توجد خيارات متاحة</p>
                      )}
                    </div>
                  </>
                )}

                {/* True/False */}
                {item.qType === 'true_false' && (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3" dir="ltr" style={{ textAlign: 'left', fontFamily: 'inherit' }}>
                      {item.prompt || item.text || 'نص السؤال'}
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        // البحث عن الإجابة باستخدام questionId
                        const questionId = item.questionId || item.id;
                        const answer = answers.find((a) => a.questionId === questionId);
                        
                        // استخدام index مباشرة: 0 لـ true (صح), 1 لـ false (خطأ)
                        const isTrueSelected = answer?.selectedOptionIndex === 0;
                        const isFalseSelected = answer?.selectedOptionIndex === 1;
                        
                        console.log('🔍 Selection state:', { isTrueSelected, isFalseSelected, selectedOptionIndex: answer?.selectedOptionIndex });
                        
                        return (
                          <>
                      <button
                              type="button"
                              onClick={() => handleTrueFalseClick(questionId, 'true')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition ${
                                isTrueSelected
                            ? 'bg-red-50 border-red-500'
                            : 'bg-slate-50 border-slate-200 hover:border-red-500'
                        }`}
                        style={{ direction: 'ltr', textAlign: 'left' }}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isTrueSelected
                            ? 'border-red-600'
                            : 'border-slate-300'
                        }`}>
                                {isTrueSelected && (
                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                          )}
                        </div>
                        <span style={{ textAlign: 'left' }}>صح</span>
                      </button>
                      <button
                              type="button"
                              onClick={() => handleTrueFalseClick(questionId, 'false')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition ${
                                isFalseSelected
                            ? 'bg-red-50 border-red-500'
                            : 'bg-slate-50 border-slate-200 hover:border-red-500'
                        }`}
                        style={{ direction: 'ltr', textAlign: 'left' }}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isFalseSelected
                            ? 'border-red-600'
                            : 'border-slate-300'
                        }`}>
                                {isFalseSelected && (
                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                          )}
                        </div>
                        <span style={{ textAlign: 'left' }}>خطأ</span>
                      </button>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Fill */}
                {item.qType === 'fill' && (
                  <div>
                    <div className="text-lg font-semibold text-slate-900 mb-4" dir="ltr" style={{ textAlign: 'left', fontFamily: 'inherit' }}>
                      {(() => {
                        // البحث عن الإجابة باستخدام questionId
                        const answer = answers.find((a) => a.questionId === item.questionId);
                        const fillValue = answer?.textAnswer || '';
                        return renderFillQuestion(
                        item.prompt || item.text || 'نص السؤال',
                          fillValue,
                        (value) => {
                          // حفظ تلقائي عند الكتابة
                          handleAnswer(itemIndex, value);
                        }
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* زر إرسال الإجابات */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting || !attemptId}
            className="px-6 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? 'جاري الإرسال…' : '✅ إرسال الإجابات'}
          </button>
        </div>
      </div>
    </div>
  );
}
