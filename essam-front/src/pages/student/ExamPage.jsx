import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';
import { authAPI } from '../../services/api';
import ExercisesList from '../../components/exam/ExercisesList';
import { sanitizeHtml, normalizeWordHtml, normalizePlainTextLineBreaks } from '../../utils/sanitizeHtml';
import './ExamPage.css';

// ✅ دالة لـ shuffle array (ترتيب عشوائي)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ✅ استخراج نص آمن من promptSnapshot أو أي حقل (يتحمل قيم غريبة من الباكند)
const safePromptString = (val) => {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && (typeof val.text === 'string' || typeof val.prompt === 'string'))
    return val.text || val.prompt || '';
  try {
    return String(val);
  } catch {
    return '';
  }
};

// ✅ عرض نص القراءة: دائماً كـ HTML (تطبيع الوورد + تنظيف) حتى تظهر المحاذاة وحجم الخط
const ReadingPassageContent = ({ text }) => {
  if (!text) return null;
  let raw = String(text).trim();
  // إن كان النص بدون وسوم نغلّفه في <p> مع <br> للأسطر حتى يُعرض بشكل صحيح
  if (!raw.includes('<')) {
    raw = '<p>' + raw.replace(/\n/g, '<br>') + '</p>';
  }
  const normalized = normalizeWordHtml(raw);
  const cleaned = sanitizeHtml(normalized);
  return (
    <div className="rich-text-content exam-passage-text" dir="ltr"
      dangerouslySetInnerHTML={{ __html: cleaned }} />
  );
};

// ✅ تحويل الخيارات إلى مصفوفة نصوص بأمان
const safeOptionsArray = (item) => {
  if (!item) return [];
  try {
    if (item.optionsText && Array.isArray(item.optionOrder)) {
      return item.optionOrder.map((idx) => {
        const opt = item.optionsText[idx] ?? item.optionsText[String(idx)];
        return typeof opt === 'string' ? opt : (opt?.text ?? opt ?? '');
      });
    }
    if (item.optionsText && typeof item.optionsText === 'object' && !Array.isArray(item.optionsText)) {
      return Object.values(item.optionsText).map((opt) =>
        typeof opt === 'string' ? opt : (opt?.text ?? opt ?? '')
      );
    }
    if (Array.isArray(item.optionsText)) {
      return item.optionsText.map((opt) => typeof opt === 'string' ? opt : (opt?.text ?? opt ?? ''));
    }
    if (Array.isArray(item.options)) {
      return item.options.map((opt) => typeof opt === 'string' ? opt : (opt?.text ?? opt ?? ''));
    }
    if (Array.isArray(item.optionsSnapshot)) {
      return item.optionsSnapshot.map((opt) => typeof opt === 'string' ? opt : (opt?.text ?? opt ?? ''));
    }
  } catch (_) { }
  return [];
};

// ✅ خيار وهمي (فارغ أو "-"/"—" أو "✓" فقط) — لا نعرضه للطالب
const isPlaceholderOptionText = (t) => {
  const s = (t != null ? String(t).trim() : '') || '';
  if (!s) return true;
  if (/^[\s\-–—ـ]+$/.test(s)) return true;
  // رموز فقط بدون نص (✓ ✔ أو حرف واحد غير حقيقي)
  if (/^[\s✓✔☑\u2713\u2714\u2611]+$/.test(s)) return true;
  if (s.length <= 1 && !/[a-zA-Z0-9\u0600-\u06FF]/.test(s)) return true;
  return false;
};

// ✅ خيارات العرض فقط (بدون الوهمية) مع المؤشرات الأصلية للإجابة
const getDisplayOptions = (item) => {
  const all = safeOptionsArray(item);
  const displayOptions = [];
  const originalIndices = [];
  all.forEach((text, idx) => {
    if (!isPlaceholderOptionText(text)) {
      displayOptions.push(text);
      originalIndices.push(idx);
    }
  });
  return { displayOptions, originalIndices };
};

// ✅ ألوان بطاقات القراءة (Lesen cards) - الخلفية والحد فقط؛ النص الافتراضي أسود
const CARD_COLORS_MAP = {
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', title: 'text-black', content: 'text-black' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', title: 'text-black', content: 'text-black' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-black', content: 'text-black' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', title: 'text-black', content: 'text-black' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', title: 'text-black', content: 'text-black' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-black', content: 'text-black' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-black', content: 'text-black' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', title: 'text-black', content: 'text-black' },
  gray: { bg: 'bg-gray-100', border: 'border-gray-200', title: 'text-black', content: 'text-black' },
};
const CARD_COLORS_LIST = Object.values(CARD_COLORS_MAP);

function ReadingCardsGrid({ cards, cardsLayout }) {
  if (!cards || cards.length === 0) return null;
  // أفقي (horizontal) = بطاقة بعرض كامل تحت بعض، عمودي (vertical) = كل 3 بطاقات جنب بعض ثم الصف اللي بعد
  const isHorizontal = cardsLayout === 'horizontal';
  const gridStyle = isHorizontal
    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }
    : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 };
  return (
    <div className="exam-cards-grid" dir="ltr" style={{ ...gridStyle, maxWidth: '100%' }}>
      {cards.map((card, idx) => {
        const color = (card.color && CARD_COLORS_MAP[card.color]) || CARD_COLORS_LIST[idx % CARD_COLORS_LIST.length];
        return (
          <div key={idx} className={`${color.bg} ${color.border} border-2 rounded-xl p-3 sm:p-4 exam-card-content`} style={{ overflow: 'visible' }}>
            <h5 className={`text-xs sm:text-sm font-bold ${color.title} mb-1.5 rich-text-content`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(card.title || '')) }} />
            <div className={`text-xs sm:text-sm ${color.content} leading-relaxed rich-text-content exam-card-entry-content`}
              style={{ overflow: 'visible', minHeight: 0 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(card.content || '')) }} />
          </div>
        );
      })}
    </div>
  );
}

// ✅ عرض بلوكات المحتوى المرنة (Sprechen وغيرها)
function ContentBlocksRenderer({ blocks, renderQuestions }) {
  if (!blocks || blocks.length === 0) return null;
  const blockType = (b) => b.blockType || b.type; // دعم blockType لو حُذف type عند الحفظ
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let questionOffset = 0;
  return (
    <div className="space-y-3 mb-3 sm:mb-4" dir="ltr">
      {sorted.map((block, idx) => {
        const bt = blockType(block);
        if (bt === 'questions' && renderQuestions) {
          const count = block.questionCount || 1;
          const start = questionOffset;
          questionOffset += count;
          return (
            <div key={idx} dir="ltr">
              {renderQuestions(start, count)}
            </div>
          );
        }
        if (bt === 'paragraph') {
          const bgColor = block.bgColor || '#fefce8';
          const borderColor = block.bgColor ? `${block.bgColor}cc` : '#fde68a';
          let raw = String(block.text || '').trim();
          if (!raw.includes('<')) raw = '<p>' + raw.replace(/\n/g, '<br>') + '</p>';
          const cleaned = sanitizeHtml(normalizeWordHtml(raw));
          return (
            <div key={idx} className="rounded-xl p-3 sm:p-4"
              style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
              <div className="leading-relaxed rich-text-content exam-passage-text"
                dangerouslySetInnerHTML={{ __html: cleaned }} />
            </div>
          );
        }
        if (bt === 'image') {
          const imgs = block.images || [];
          if (imgs.length === 0) return null;
          return (
            <div key={idx} className={imgs.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
              {imgs.map((img, imgIdx) => (
                <div key={imgIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <img
                    src={img.url?.startsWith('http') ? img.url : toApiUrl(img.url)}
                    alt={img.description || `Image ${imgIdx + 1}`}
                    className="w-full h-auto"
                    style={{ maxHeight: 400, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {img.description && (
                    <p className="text-xs text-slate-500 p-2 text-center">{img.description}</p>
                  )}
                </div>
              ))}
            </div>
          );
        }
        if (bt === 'cards') {
          const cards = block.cards || [];
          if (cards.length === 0) return null;
          const isHorizontal = block.cardsLayout === 'horizontal';
          const gridStyle = isHorizontal
            ? { display: 'grid', gridTemplateColumns: '1fr', gap: 12 }
            : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
          return (
            <div key={idx} className="exam-cards-grid" dir="ltr" style={{ ...gridStyle, maxWidth: '100%' }}>
              {cards.map((card, cardIdx) => {
                const color = (card.color && CARD_COLORS_MAP[card.color]) || CARD_COLORS_LIST[cardIdx % CARD_COLORS_LIST.length];
                return (
                  <div key={cardIdx} className={`${color.bg} ${color.border} border-2 rounded-xl p-4 sm:p-5 exam-card-content`} style={{ overflow: 'visible' }}>
                    <h5 className={`text-xs sm:text-sm font-bold ${color.title} mb-2 sm:mb-3 rich-text-content`}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(card.title || '')) }} />
                    {card.image?.url && (
                      <div className="flex justify-center mb-2">
                        <img
                          src={card.image.url.startsWith('http') ? card.image.url : toApiUrl(card.image.url)}
                          alt=""
                          style={{ width: '100%', maxWidth: 300, height: 'auto', objectFit: 'contain', borderRadius: 6 }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {(card.texts || []).map((entry, ti) => (
                      <div key={ti} className="mb-2 exam-card-entry" style={{ overflow: 'visible' }}>
                        {entry.label && (
                          <span className={`text-xs font-semibold ${color.title}`}>{entry.label}: </span>
                        )}
                        <div className={`text-xs sm:text-sm ${color.content} leading-relaxed rich-text-content exam-card-entry-content`}
                          style={{ overflow: 'visible', minHeight: 0 }}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeWordHtml(entry.content || '')) }} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        }
        if (bt === 'audio') {
          const audioSrc = block.audioUrl
            ? (block.audioUrl.startsWith('http') ? block.audioUrl : toApiUrl(block.audioUrl))
            : null;
          if (!audioSrc) return null;
          return (
            <div key={idx} className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
              <span className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 block">
                🎵 ملف الاستماع
              </span>
              <audio controls controlsList="nodownload" preload="metadata" src={audioSrc} className="w-full">
                المتصفح لا يدعم تشغيل الملفات الصوتية
              </audio>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ✅ Component منفصل لـ Reorder Task
function ReorderTask({ parts, prompt, itemIndex, answers, setAnswers, saveAnswer, isSubmitted, questionId }) {
  // ✅ استخدام state محلي للترتيب (مع shuffle عند التحميل)
  const [reorderParts, setReorderParts] = useState(() => {
    // قراءة الترتيب المحفوظ أو shuffle
    const savedOrder = answers[itemIndex]?.reorderAnswer;
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length === parts.length) {
      // استخدام الترتيب المحفوظ
      return savedOrder.map(id => parts.find(p => p.id === id)).filter(Boolean);
    }
    // shuffle عند التحميل الأول
    return shuffleArray([...parts]);
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ تحديث reorderParts عند تحميل الإجابات المحفوظة
  useEffect(() => {
    if (!isInitialized) {
      const savedOrder = answers[itemIndex]?.reorderAnswer;
      if (savedOrder && Array.isArray(savedOrder) && savedOrder.length === parts.length) {
        const orderedParts = savedOrder.map(id => parts.find(p => p.id === id)).filter(Boolean);
        if (orderedParts.length === parts.length) {
          setReorderParts(orderedParts);
        }
      }
      setIsInitialized(true);
    }
  }, [answers, itemIndex, parts, isInitialized]);

  // ✅ Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newParts = [...reorderParts];
    const draggedPart = newParts[draggedIndex];
    newParts.splice(draggedIndex, 1);
    newParts.splice(dropIndex, 0, draggedPart);

    setReorderParts(newParts);

    // ✅ حفظ الترتيب كـ array من IDs
    const reorderAnswer = newParts.map(p => p.id);
    const newAnswers = { ...answers };
    newAnswers[itemIndex] = { reorderAnswer };
    setAnswers(newAnswers);
    saveAnswer(itemIndex, questionId, { reorderAnswer });
  };

  return (
    <div className="mb-4">
      {/* عرض prompt أولاً */}
      {prompt && (
        <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-2" dir="ltr">
          {prompt}
        </h3>
      )}

      {/* عرض Reorder list */}
      <div className="space-y-2">
        <p className="text-sm text-slate-600 mb-3">
          اسحب وأعد ترتيب الأجزاء بالترتيب الصحيح:
        </p>
        {reorderParts.map((part, index) => (
          <div
            key={part.id}
            draggable={!isSubmitted}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`p-3 rounded-lg border-2 cursor-move transition-all ${draggedIndex === index
              ? 'border-blue-400 bg-blue-50 opacity-50'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              } ${isSubmitted ? 'cursor-default' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                {index + 1}
              </div>
              <div className="flex-1 text-base text-slate-900">
                {/<[^>]+>/.test(part.text || '') ? (
                  <span dangerouslySetInnerHTML={{ __html: part.text }} />
                ) : (
                  part.text
                )}
              </div>
              {!isSubmitted && (
                <div className="flex-shrink-0 text-slate-400">
                  ⋮⋮
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ API Base URL للـ media URLs
// استخدام VITE_API_BASE_URL (أو VITE_API_URL كـ fallback)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://api.deutsch-tests.com';

// ✅ دالة لتحويل URL النسبي إلى full URL
const toApiUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // ✅ الحفاظ على الحالة الأصلية للـ path (لا نغير الحروف)
  // الباك قد يحفظ الملف بحرف صغير أو كبير، يجب استخدام نفس الحالة
  return `${API_BASE_URL}${path}`;
};

// ✅ دالة لبناء URL من key
// الـ key يكون مثل: "images/ولايات/Rheinland-Pfalz1سؤال صورة.jpeg"
// نستخدم الـ key مباشرة - المتصفح هيعمل encoding تلقائياً عند إرسال الطلب
// لكن نعمل encoding يدوي علشان نتأكد إن الـ URL صحيح في الـ img src
const buildImageUrlFromKey = (key) => {
  if (!key) return '';
  // ✅ تقسيم الـ key على / وعمل encoding على كل جزء
  // ده يضمن إن الأحرف العربية والألمانية تتحول لـ URL encoding صحيح
  // لكن نحافظ على الـ / في المسار
  const segments = key.split('/');
  const encodedSegments = segments.map(segment => encodeURIComponent(segment));
  const encodedPath = encodedSegments.join('/');
  return `${API_BASE_URL}/uploads/${encodedPath}`;
};

// ✅ دالة لإصلاح mime type لملفات .opus
const getCorrectMimeType = (url, mime) => {
  if (!url) return mime || 'audio/mpeg';

  // إذا كان الملف .opus، نستخدم audio/ogg أو audio/opus
  if (url.toLowerCase().endsWith('.opus')) {
    return 'audio/ogg'; // المتصفحات تدعم audio/ogg لملفات .opus
  }

  // إذا كان mime موجود وصحيح، نستخدمه
  if (mime && mime !== 'audio/mpeg' && !url.toLowerCase().endsWith('.opus')) {
    return mime;
  }

  // تحديد mime type بناءً على extension
  const ext = url.toLowerCase().split('.').pop();
  const mimeMap = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'opus': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac'
  };

  return mimeMap[ext] || mime || 'audio/mpeg';
};

// Component لتسجيل الصوت
function SpeakingAnswerComponent({ itemIndex, item, answer, isSubmitted, onAnswerChange, minDuration, maxDuration }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(answer || null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // التحقق من الحد الأقصى
          if (maxDuration && newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording, maxDuration]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(localUrl);
        stream.getTracks().forEach(track => track.stop());

        // رفع الملف للباك
        try {
          setUploading(true);
          setError('');
          const response = await examsAPI.uploadAudio(blob);
          // response.audioUrl أو response.url حسب ما يرجع الباك
          const uploadedUrl = response.audioUrl || response.url || response.data?.audioUrl || response.data?.url;
          if (uploadedUrl) {
            // تحديث audioUrl بالـ URL من الباك
            setAudioUrl(uploadedUrl);
            // إرسال URL للـ parent component
            onAnswerChange(uploadedUrl);
          } else {
            throw new Error('لم يتم إرجاع URL من الباك');
          }
        } catch (err) {
          console.error('Error uploading audio:', err);
          setError('حدث خطأ أثناء رفع الملف الصوتي. يرجى المحاولة مرة أخرى.');
          // إزالة التسجيل المحلي في حالة فشل الرفع
          URL.revokeObjectURL(localUrl);
          setAudioUrl(null);
          setAudioBlob(null);
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      // التحقق من الحد الأدنى
      if (minDuration && recordingTime < minDuration) {
        setError(`يجب أن تكون مدة التسجيل على الأقل ${minDuration} ثانية`);
        setAudioUrl(null);
        setAudioBlob(null);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    onAnswerChange(null);
    setError('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}

      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs text-blue-700">جاري رفع الملف الصوتي...</p>
        </div>
      )}

      {audioUrl && !isRecording && !uploading && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">🎤 التسجيل المحفوظ</span>
            {!isSubmitted && (
              <button
                onClick={deleteRecording}
                className="text-xs text-red-600 hover:text-red-700"
              >
                حذف
              </button>
            )}
          </div>
          <audio src={audioUrl} controls controlsList="nodownload" className="w-full" />
        </div>
      )}

      {!audioUrl && !isRecording && !uploading && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600 mb-3">لم يتم تسجيل إجابة صوتية بعد</p>
          {!isSubmitted && (
            <button
              onClick={startRecording}
              disabled={uploading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎤 بدء التسجيل
            </button>
          )}
        </div>
      )}

      {isRecording && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-red-700">جاري التسجيل...</span>
          </div>
          <div className="text-2xl font-bold text-red-600 mb-3">
            {formatTime(recordingTime)}
            {maxDuration && ` / ${formatTime(maxDuration)}`}
          </div>
          <button
            onClick={stopRecording}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            ⏹ إيقاف التسجيل
          </button>
        </div>
      )}

      {(minDuration || maxDuration) && (
        <div className="text-xs text-slate-500">
          {minDuration && <span>الحد الأدنى: {minDuration} ثانية</span>}
          {minDuration && maxDuration && <span> • </span>}
          {maxDuration && <span>الحد الأقصى: {maxDuration} ثانية</span>}
        </div>
      )}
    </div>
  );
}

function ExamPage() {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sections sidebar state
  const [sectionsOverview, setSectionsOverview] = useState(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState(null);

  // Exercise mode state
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sectionExercises, setSectionExercises] = useState({}); // cache: { [sectionKey]: { exercises: [...] } }

  // Check answer state: { [itemIndex]: { isCorrect, score, maxPoints, correctAnswer, checking } }
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Section summary state: { [sectionKey]: { loading, data, error } }
  const [sectionSummaries, setSectionSummaries] = useState({});

  useEffect(() => {
    if (attemptId) {
      loadAttempt();
    }
  }, [attemptId]);

  // هل الامتحان يحتوي على أقسام حقيقية (غير _default)؟
  const [examHasRealSections, setExamHasRealSections] = useState(true);

  // Fetch sections overview when attempt loads (+ fallback لامتحانات بدون أقسام: جلب _default)
  useEffect(() => {
    if (attempt?.examId || attempt?.exam?.id || attempt?.exam?._id) {
      const examId = attempt.examId || attempt.exam?.id || attempt.exam?._id;
      examsAPI.getSectionsOverview(examId)
        .then((data) => {
          const sections = data.sections || data || [];
          const hasReal = data.hasSections !== false;
          setExamHasRealSections(hasReal);
          if (sections.length > 0) {
            setSectionsOverview(sections);
            if (hasReal) {
              setSelectedSectionKey((prev) => (prev == null ? sections[0].key : prev));
            } else {
              setSelectedSectionKey(sections[0].key);
            }
          } else {
            // امتحان بدون أقسام في الـ overview: نجرب جلب قسم _default (قد يكون المحتوى هناك)
            examsAPI.getSectionQuestions(examId, '_default')
              .then((sectionData) => {
                const exs = sectionData?.exercises || [];
                if (exs.length > 0) {
                  setSectionsOverview([{ key: '_default', title: 'المحتوى', order: 0 }]);
                  setExamHasRealSections(false);
                  setSelectedSectionKey('_default');
                  setSectionExercises(prev => ({ ...prev, _default: sectionData }));
                }
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.log('No sections for this exam:', err.response?.status);
          const examId = attempt?.examId || attempt?.exam?.id || attempt?.exam?._id;
          if (examId) {
            examsAPI.getSectionQuestions(examId, '_default')
              .then((sectionData) => {
                const exs = sectionData?.exercises || [];
                if (exs.length > 0) {
                  setSectionsOverview([{ key: '_default', title: 'المحتوى', order: 0 }]);
                  setExamHasRealSections(false);
                  setSelectedSectionKey('_default');
                  setSectionExercises(prev => ({ ...prev, _default: sectionData }));
                }
              })
              .catch(() => {});
          }
        });
    }
  }, [attempt?.examId, attempt?.exam?.id]);

  // ✅ التأكد من أن attempt.items دائماً فريدة (حماية إضافية)
  useEffect(() => {
    if (attempt && attempt.items && attempt.items.length > 0) {
      const seenQuestions = new Set();
      const uniqueItems = attempt.items.filter((item, idx) => {
        const questionId = item.questionId || item.id || item._id || item.question?.id || item.question?._id || item.questionSnapshot?.id || item.questionSnapshot?._id;
        const uniqueId = questionId ? `q-${questionId}` : `idx-${idx}`;

        if (seenQuestions.has(uniqueId)) {
          console.warn(`⚠️ Duplicate question detected in attempt.items at index ${idx}:`, {
            questionId,
            uniqueId,
            prompt: item.prompt || item.text,
          });
          return false;
        }

        seenQuestions.add(uniqueId);
        return true;
      });

      // ✅ إذا كان هناك تكرارات، نحدث attempt.items
      if (uniqueItems.length !== attempt.items.length) {
        console.log(`✅ Removing ${attempt.items.length - uniqueItems.length} duplicate questions from attempt.items`);
        setAttempt({ ...attempt, items: uniqueItems });
      }
    }
  }, [attempt]);

  // ✅ بناء خريطة questionId → globalItemIndex للتمارين (مفتاح نصي للتطابق مع الـ API)
  const questionIdToItemIndex = useMemo(() => {
    const map = new Map();
    if (attempt?.items) {
      attempt.items.forEach((item, idx) => {
        const qId = item.questionId || item.id || item._id ||
          item.question?.id || item.question?._id ||
          item.questionSnapshot?.id || item.questionSnapshot?._id;
        if (qId) map.set(String(qId), idx);
      });
    }
    return map;
  }, [attempt?.items]);

  // ✅ جلب التمارين لكل الأقسام عند تحميل الامتحان (لعرضها في "كل الأسئلة")
  useEffect(() => {
    if (!sectionsOverview || !attempt) return;
    const examId = attempt.examId || attempt.exam?.id || attempt.exam?._id;
    if (!examId) return;

    sectionsOverview.forEach((section) => {
      if (sectionExercises[section.key]) return;
      examsAPI.getSectionQuestions(examId, section.key)
        .then((data) => {
          setSectionExercises(prev => ({ ...prev, [section.key]: data || { exercises: [] } }));
        })
        .catch(() => {
          // حفظ القسم حتى لو فشل التحميل عشان allLoaded يشتغل
          setSectionExercises(prev => ({ ...prev, [section.key]: { exercises: [] } }));
        });
    });
  }, [sectionsOverview, attempt]);

  // ✅ جلب التمارين عند اختيار قسم (loading state)
  useEffect(() => {
    if (!selectedSectionKey || !attempt) return;
    if (sectionExercises[selectedSectionKey]) return;

    const examId = attempt.examId || attempt.exam?.id || attempt.exam?._id;
    if (!examId) return;

    setLoadingExercises(true);
    setSelectedExercise(null);

    examsAPI.getSectionQuestions(examId, selectedSectionKey)
      .then((data) => {
        setSectionExercises(prev => ({ ...prev, [selectedSectionKey]: data || { exercises: [] } }));
      })
      .catch(() => {
        setSectionExercises(prev => ({ ...prev, [selectedSectionKey]: { exercises: [] } }));
      })
      .finally(() => {
        setLoadingExercises(false);
      });
  }, [selectedSectionKey, attempt]);

  // ✅ امتحان بدون أقسام: إذا قسم واحد وتمرين واحد → اختيار التمرين تلقائياً لعرض المحتوى مباشرة
  useEffect(() => {
    if (!selectedSectionKey || selectedExercise) return;
    const data = sectionExercises[selectedSectionKey];
    const exercises = data?.exercises || [];
    if (exercises.length === 1 && (exercises[0].contentBlocks?.length > 0 || exercises[0].audioUrl || exercises[0].readingPassage || (exercises[0].readingCards?.length > 0))) {
      setSelectedExercise(exercises[0]);
    }
  }, [selectedSectionKey, sectionExercises, selectedExercise]);

  // ✅ تصفية attempt.items لإزالة الأسئلة المحذوفة التي لم تعد في أقسام الامتحان
  useEffect(() => {
    if (!attempt?.items || !sectionsOverview || sectionsOverview.length === 0) return;
    // انتظر حتى تحميل بيانات جميع الأقسام
    const allLoaded = sectionsOverview.every((s) => sectionExercises[s.key]);
    if (!allLoaded) return;

    // بناء set بكل questionIds المنشورة من بيانات الأقسام
    const publishedIds = new Set();
    Object.values(sectionExercises).forEach((sectionData) => {
      (sectionData.exercises || []).forEach((ex) => {
        (ex.questions || []).forEach((q) => {
          if (q.questionId) publishedIds.add(q.questionId);
        });
      });
    });

    if (publishedIds.size === 0) return;

    // فلترة + إزالة التكرارات (نفس questionId مرتين بسبب خطأ في البيانات)
    const seenQids = new Set();
    const filtered = attempt.items.filter((item) => {
      const qid = item.questionId || item.id || item._id ||
        item.question?.id || item.question?._id ||
        item.questionSnapshot?.id || item.questionSnapshot?._id;
      if (!qid || !publishedIds.has(qid)) return false;
      if (seenQids.has(qid)) return false; // إزالة التكرارات
      seenQids.add(qid);
      return true;
    });

    if (filtered.length < attempt.items.length) {
      console.log(`✅ Filtered out ${attempt.items.length - filtered.length} deleted/duplicate questions from attempt.items`);
      setAttempt({ ...attempt, items: filtered });
    }
  }, [sectionExercises, sectionsOverview]);

  // ✅ يجب استدعاء جميع الـ Hooks قبل أي early return (قواعد React)
  const currentSectionData = selectedSectionKey ? sectionExercises[selectedSectionKey] : null;
  const sectionQuestionIds = useMemo(() => {
    if (!selectedSectionKey || !currentSectionData?.exercises) return null;
    const ids = new Set();
    currentSectionData.exercises.forEach((ex) => {
      (ex.questions || []).forEach((q) => {
        if (q.questionId) ids.add(q.questionId);
      });
    });
    return ids;
  }, [selectedSectionKey, currentSectionData]);

  // ✅ ترتيب كل الأسئلة حسب تعريف الأقسام من الـ API (مصدر واحد — لا أسئلة وهمية تظهر في "كل الأسئلة" فقط)
  const allSectionsOrderedQuestionIds = useMemo(() => {
    if (!sectionsOverview?.length || !sectionExercises || Object.keys(sectionExercises).length === 0) return [];
    const ids = [];
    const seenIds = new Set();
    const sortedSections = [...sectionsOverview].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const section of sortedSections) {
      const data = sectionExercises[section.key];
      if (!data?.exercises) continue;
      for (const ex of data.exercises || []) {
        for (const q of ex.questions || []) {
          // إزالة التكرارات (نفس questionId في تمرينين بسبب خطأ بالباك)
          if (q.questionId && !seenIds.has(String(q.questionId))) {
            seenIds.add(String(q.questionId));
            ids.push(String(q.questionId));
          }
        }
      }
    }
    return ids;
  }, [sectionsOverview, sectionExercises]);

  // ✅ خريطة questionId → بيانات التمرين (صوت، قراءة، contentBlocks) لعرضها في "كل الأسئلة"
  // استخدام String(questionId) كمفتاح لضمان التطابق (الـ API قد يعيد ObjectId أو string)
  const questionExerciseMap = useMemo(() => {
    const map = new Map();
    Object.values(sectionExercises).forEach((sectionData) => {
      (sectionData.exercises || []).forEach((exercise) => {
        (exercise.questions || []).forEach((q) => {
          const qid = q.questionId != null ? String(q.questionId) : '';
          if (qid) {
            map.set(qid, {
              audioUrl: exercise.audioUrl,
              readingPassage: exercise.readingPassage,
              readingPassageBgColor: exercise.readingPassageBgColor,
              readingCards: exercise.readingCards,
              cardsLayout: exercise.cardsLayout,
              contentBlocks: exercise.contentBlocks,
              title: exercise.title,
              exerciseIndex: exercise.exerciseIndex ?? exercise.exerciseNumber,
              exerciseId: `ex-${exercise.exerciseIndex ?? exercise.exerciseNumber}-${exercise.title || ''}`,
            });
          }
        });
      });
    });
    return map;
  }, [sectionExercises]);

  // ✅ خريطة questionId → بيانات السؤال الكاملة من sectionExercises (لأسئلة مضافة بعد بدء المحاولة)
  const sectionQuestionDataMap = useMemo(() => {
    const map = new Map();
    Object.entries(sectionExercises).forEach(([sectionKey, sectionData]) => {
      (sectionData.exercises || []).forEach((exercise) => {
        (exercise.questions || []).forEach((q) => {
          if (q.questionId && !map.has(String(q.questionId))) {
            map.set(String(q.questionId), { ...q, sectionKey });
          }
        });
      });
    });
    return map;
  }, [sectionExercises]);

  const loadAttempt = async () => {
    try {
      setLoading(true);
      setError('');
      // ✅ استخراج examId من query string
      const examId = searchParams.get('examId');

      // ✅ إرسال examId في query string عند جلب المحاولة للتحقق من أن المحاولة تنتمي للامتحان
      const attemptData = await examsAPI.getAttempt(attemptId, examId);

      console.log('📥 Loading attempt with:', { attemptId, examId });

      // ✅ تحقق أمني: التأكد من أن المحاولة تنتمي للامتحان المحدد (إذا كان examId موجود)
      if (examId && attemptData.examId && attemptData.examId !== examId) {
        console.error('❌ Security: Attempt examId mismatch!', {
          expectedExamId: examId,
          actualExamId: attemptData.examId,
          attemptId
        });
        setError('⚠️ خطأ أمني: المحاولة لا تنتمي للامتحان المحدد. يرجى المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }

      console.log('📥 Attempt data received:', attemptData);
      console.log('📋 Attempt items:', attemptData.items);
      console.log('📊 Items count:', attemptData.items?.length || 0);

      // التحقق من structure الـ response
      if (!attemptData) {
        throw new Error('لم يتم إرجاع بيانات المحاولة');
      }

      // معالجة items - قد تكون في attemptData.items أو attemptData.data.items
      let items = attemptData.items || attemptData.data?.items || [];

      // إذا كان items مصفوفة فارغة — محاولة قديمة/فارغة أو محتوى تعليمي فقط
      if (!Array.isArray(items) || items.length === 0) {
        const examIdForRetry = searchParams.get('examId') || attemptData.examId;
        const isEducational = !!attemptData.exam?.isEducational;
        if (examIdForRetry && !isEducational) {
          try {
            if (attemptData.attemptId && attemptData.status === 'in_progress') {
              await examsAPI.submitAttempt(attemptData.attemptId, []);
              console.log('✅ تم تسليم المحاولة الفاضية، جاري بدء محاولة جديدة...');
            }
            const newAttempt = await examsAPI.startAttempt(examIdForRetry);
            const newAttemptId = newAttempt.attemptId || newAttempt._id || newAttempt.id;
            const newItems = newAttempt.items || newAttempt.questions || [];
            if (newAttemptId && newItems.length > 0) {
              window.location.href = `/student/exam/${newAttemptId}?examId=${examIdForRetry}`;
              setLoading(false);
              return;
            }
            // محتوى تعليمي فقط: المحاولة الجديدة بدون أسئلة — نعرض الصفحة
            if (newAttemptId && newAttempt.exam?.isEducational) {
              setAttempt({ ...newAttempt, items: newAttempt.items || [] });
              setLoading(false);
              return;
            }
          } catch (retryErr) {
            console.warn('⚠️ إعادة البدء لم تنجح:', retryErr?.response?.data || retryErr?.message);
          }
        }
        // محتوى تعليمي أو محاولة فارغة: نعرض الصفحة على أي حال (المحتوى من الأقسام يظهر دون رسالة خطأ)
        setAttempt({ ...attemptData, items: [] });
        setLoading(false);
        return;
      }

      // استخراج بيانات الأسئلة من questionSnapshot
      try {
        console.log('🔍 Raw items from API:', items?.length, 'items');
        if (items[0]) console.log('🔍 First item keys:', Object.keys(items[0]));
      } catch (_) { }

      const formattedItems = items.map((item, idx) => {
        try {
          // إذا كان في questionSnapshot (كائن)، استخرج البيانات منه
          if (item.questionSnapshot && typeof item.questionSnapshot === 'object') {
            const formatted = {
              ...item,
              prompt: item.questionSnapshot.text || item.questionSnapshot.prompt,
              text: item.questionSnapshot.text || item.questionSnapshot.prompt,
              qType: item.questionSnapshot.qType,
              type: item.questionSnapshot.qType,
              options: Array.isArray(item.questionSnapshot.options) ? item.questionSnapshot.options : [],
              question: item.questionSnapshot,
              // ✅ إضافة answerKeyMatch من questionSnapshot (مهم لأسئلة match)
              // فحص جميع الأماكن المحتملة
              answerKeyMatch: item.questionSnapshot.answerKeyMatch ||
                item.answerKeyMatch ||
                item.promptSnapshot?.answerKeyMatch,
              // ✅ إضافة promptSnapshot أيضاً (قد يحتوي على answerKeyMatch)
              promptSnapshot: item.promptSnapshot || item.questionSnapshot,
              // الاحتفاظ بمعلومات Section
              sectionId: item.sectionId,
              section: item.section,
            };
            return formatted;
          }

          // إذا كان في question (كائن)، استخدمه
          if (item.question && typeof item.question === 'object') {
            const formatted = {
              ...item,
              prompt: item.question.text || item.question.prompt,
              text: item.question.text || item.question.prompt,
              qType: item.question.qType,
              type: item.question.qType,
              options: Array.isArray(item.question.options) ? item.question.options : [],
              answerKeyMatch: item.question.answerKeyMatch || item.answerKeyMatch,
              sectionId: item.sectionId,
              section: item.section,
            };
            return formatted;
          }

          // إذا مافيش questionSnapshot ولا question، استخدم البيانات الموجودة
          return item;
        } catch (err) {
          console.warn(`⚠️ Error formatting item ${idx}, using minimal fallback:`, err);
          return {
            ...item,
            prompt: safePromptString(item.promptSnapshot ?? item.prompt ?? item.text),
            text: safePromptString(item.promptSnapshot ?? item.prompt ?? item.text),
            qType: item.qType || 'mcq',
            options: safeOptionsArray(item),
          };
        }
      });

      // تجميع الأسئلة حسب Section
      const sectionsMap = new Map();
      formattedItems.forEach((item, idx) => {
        const sectionId = item.sectionId || 'default';
        const section = item.section || { title: 'أسئلة عامة' };

        if (!sectionsMap.has(sectionId)) {
          sectionsMap.set(sectionId, {
            id: sectionId,
            title: section.title || section.name || 'أسئلة عامة',
            items: []
          });
        }
        sectionsMap.get(sectionId).items.push({ ...item, originalIndex: idx });
      });

      // ✅ إزالة التكرارات من formattedItems (خاصة لأسئلة الاستماع)
      // استخدام Set لتتبع الأسئلة الفريدة بناءً على questionId أو id
      const seenQuestions = new Set();
      const uniqueItems = formattedItems.filter((item, idx) => {
        const questionId = item.questionId || item.id || item._id || item.question?.id || item.question?._id || item.questionSnapshot?.id || item.questionSnapshot?._id;
        const uniqueId = questionId ? `q-${questionId}` : `idx-${idx}`;

        if (seenQuestions.has(uniqueId)) {
          console.warn(`⚠️ Duplicate question detected at index ${idx}:`, {
            questionId,
            uniqueId,
            prompt: item.prompt || item.text,
            item
          });
          return false; // إزالة السؤال المكرر
        }

        seenQuestions.add(uniqueId);
        return true;
      });

      console.log(`✅ Removed ${formattedItems.length - uniqueItems.length} duplicate questions`);
      console.log(`✅ Total unique questions: ${uniqueItems.length}`);

      // تحديث attemptData مع items الصحيحة و sections
      const attemptWithItems = {
        ...attemptData,
        items: uniqueItems,
        sections: Array.from(sectionsMap.values()),
      };

      setAttempt(attemptWithItems);

      // تحميل الإجابات المحفوظة
      if (attemptData.answers) {
        const savedAnswers = {};
        attemptData.answers.forEach((answer) => {
          // ✅ استخدام uniqueItems بدلاً من formattedItems بعد إزالة التكرارات
          // ✅ البحث عن السؤال باستخدام questionId أولاً، ثم الفهرس
          let item = null;
          let newItemIndex = answer.itemIndex;

          if (answer.questionId) {
            // البحث عن السؤال باستخدام questionId في uniqueItems
            const foundIndex = uniqueItems.findIndex(item =>
              item.questionId === answer.questionId ||
              item.id === answer.questionId ||
              item._id === answer.questionId ||
              item.question?.id === answer.questionId ||
              item.questionSnapshot?.id === answer.questionId
            );
            if (foundIndex !== -1) {
              item = uniqueItems[foundIndex];
              newItemIndex = foundIndex;
            }
          }

          // إذا لم نجد السؤال باستخدام questionId، نستخدم الفهرس (إذا كان صالحاً)
          if (!item && answer.itemIndex < uniqueItems.length) {
            item = uniqueItems[answer.itemIndex];
            newItemIndex = answer.itemIndex;
          }

          if (!item) {
            console.warn(`⚠️ Could not find item for answer:`, answer);
            return; // تخطي هذه الإجابة
          }

          const qType = item?.qType || item?.type || 'mcq';

          if (qType === 'mcq' && answer.studentAnswerIndexes && Array.isArray(answer.studentAnswerIndexes)) {
            // تحويل array إلى selectedIndex واحد (آخر عنصر أو الأول)
            savedAnswers[newItemIndex] = {
              selectedIndex: answer.studentAnswerIndexes.length > 0 ? answer.studentAnswerIndexes[0] : null,
            };
          } else if (qType === 'interactive_text') {
            // Interactive Text: حفظ reorderAnswer أو interactiveAnswers
            if (answer.reorderAnswer) {
              savedAnswers[newItemIndex] = { reorderAnswer: answer.reorderAnswer };
            } else if (answer.interactiveAnswers) {
              savedAnswers[newItemIndex] = { interactiveAnswers: answer.interactiveAnswers };
            } else {
              savedAnswers[newItemIndex] = answer;
            }
          } else {
            // للأنواع الأخرى، احفظ كما هي
            savedAnswers[newItemIndex] = answer;
          }
        });
        setAnswers(savedAnswers);
      }
    } catch (err) {
      console.error('❌ Error loading attempt:', err);
      console.error('   Error response:', err.response?.data);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء تحميل الامتحان'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (itemIndex, answer, questionType) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev };

      // بناء كائن الإجابة حسب نوع السؤال
      if (questionType === 'mcq') {
        // حفظ آخر اختيار واحد فقط (وليس array)
        newAnswers[itemIndex] = {
          selectedIndex: typeof answer === 'number' ? answer : (Array.isArray(answer) ? answer[0] : answer),
        };
      } else if (questionType === 'true_false') {
        newAnswers[itemIndex] = {
          studentAnswerBoolean: answer,
        };
      } else if (questionType === 'fill') {
        console.log('✏️ handleAnswerChange for fill:', { itemIndex, answer, questionType });
        newAnswers[itemIndex] = {
          studentAnswerText: answer,
        };
        console.log('✏️ Updated answers:', newAnswers);
      } else if (questionType === 'free_text') {
        newAnswers[itemIndex] = {
          textAnswer: answer,
        };
      } else if (questionType === 'speaking') {
        newAnswers[itemIndex] = {
          audioAnswerUrl: answer, // URL من الباك بعد الرفع
        };
      } else if (questionType === 'match') {
        newAnswers[itemIndex] = {
          studentAnswerMatch: answer,
        };
      } else if (questionType === 'reorder') {
        newAnswers[itemIndex] = {
          studentAnswerReorder: answer,
        };
      } else if (questionType === 'interactive_text') {
        // Interactive Text: الإجابة هي object يحتوي على interactiveAnswers
        newAnswers[itemIndex] = answer; // answer هو object كامل مع interactiveAnswers
      } else {
        // fallback - حفظ مباشر
        newAnswers[itemIndex] = answer;
      }

      return newAnswers;
    });
  };

  // ✅ حفظ إجابة سؤال واحد فوراً → POST /attempts/:attemptId/answer
  const saveAnswer = async (itemIndex, questionId, answer, itemOverride = null) => {
    try {
      const item = itemOverride || (typeof itemIndex === 'number' && attempt.items[itemIndex]) || null;
      if (!item || !questionId) return;
      const question = item.question || item;
      const qType = question.qType || question.type || item.qType || item.type || 'mcq';

      const answerData = { questionId };

      if (qType === 'mcq') {
        answerData.selectedOptionIndexes = typeof answer === 'number' ? [answer] : (Array.isArray(answer) ? answer : [answer]);
      } else if (qType === 'true_false') {
        const boolVal = typeof answer === 'boolean' ? answer : !!answer;
        answerData.selectedOptionIndexes = boolVal ? [0] : [1];
      } else if (qType === 'fill') {
        if (answer?.fillAnswers && Array.isArray(answer.fillAnswers)) {
          const fillExact = item.fillExact || item.questionSnapshot?.fillExact || item.question?.fillExact || [];
          if (fillExact.length === 1) {
            answerData.answerText = answer.fillAnswers[0] || '';
          } else {
            answerData.answerText = answer.fillAnswers.filter(a => a && a.trim()).join(', ') || '';
          }
        } else if (answer?.fillAnswer) {
          answerData.answerText = answer.fillAnswer;
        } else if (typeof answer === 'string') {
          answerData.answerText = answer;
        } else if (answer?.studentAnswerText) {
          answerData.answerText = answer.studentAnswerText;
        } else if (answer?.answerText) {
          answerData.answerText = answer.answerText;
        }
      } else if (qType === 'free_text') {
        answerData.answerText = answer?.textAnswer || (typeof answer === 'string' ? answer : '');
      } else if (qType === 'speaking') {
        answerData.audioAnswerUrl = answer?.audioAnswerUrl || (typeof answer === 'string' ? answer : '');
      } else if (qType === 'match') {
        answerData.studentAnswerMatch = answer?.studentAnswerMatch || answer;
      } else if (qType === 'reorder') {
        answerData.studentAnswerReorder = answer?.studentAnswerReorder || answer;
      } else if (qType === 'interactive_text') {
        if (answer?.reorderAnswer) {
          answerData.reorderAnswer = answer.reorderAnswer;
        } else if (answer?.interactiveAnswers) {
          answerData.interactiveAnswers = answer.interactiveAnswers;
        } else if (typeof answer === 'object') {
          answerData.interactiveAnswers = answer;
        }
      }

      await examsAPI.saveAnswer(attemptId, answerData);
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  };

  // ✅ فحص إجابة سؤال واحد → POST /attempts/:attemptId/check-answer
  const handleCheckAnswer = async (itemIndex, questionId, itemOverride = null) => {
    try {
      const userAnswer = answers[itemIndex];
      if (!userAnswer) return;

      const item = itemOverride || (typeof itemIndex === 'number' && attempt.items[itemIndex]) || null;
      if (!item || !questionId) return;

      const question = item.question || item;
      const qType = question.qType || question.type || item.qType || item.type || 'mcq';

      // علّم السؤال كـ "جاري الفحص"
      setCheckedQuestions(prev => ({ ...prev, [itemIndex]: { checking: true } }));

      const answerData = { questionId };

      if (qType === 'mcq') {
        const idx = userAnswer?.selectedIndex;
        answerData.selectedOptionIndexes = idx !== null && idx !== undefined ? [idx] : [];
      } else if (qType === 'true_false') {
        answerData.studentAnswerBoolean = userAnswer?.studentAnswerBoolean;
      } else if (qType === 'fill') {
        if (userAnswer?.fillAnswers && Array.isArray(userAnswer.fillAnswers)) {
          const fillExact = item.fillExact || item.questionSnapshot?.fillExact || item.question?.fillExact || [];
          answerData.answerText = fillExact.length === 1
            ? (userAnswer.fillAnswers[0] || '')
            : (userAnswer.fillAnswers.filter(a => a && a.trim()).join(', ') || '');
        } else if (userAnswer?.studentAnswerText) {
          answerData.answerText = userAnswer.studentAnswerText;
        } else if (typeof userAnswer === 'string') {
          answerData.answerText = userAnswer;
        }
      } else if (qType === 'match') {
        answerData.studentAnswerMatch = userAnswer?.studentAnswerMatch || userAnswer;
      } else if (qType === 'reorder') {
        answerData.studentAnswerReorder = userAnswer?.studentAnswerReorder || userAnswer;
      } else if (qType === 'interactive_text') {
        if (userAnswer?.reorderAnswer) {
          answerData.reorderAnswer = userAnswer.reorderAnswer;
        } else if (userAnswer?.interactiveAnswers) {
          answerData.interactiveAnswers = userAnswer.interactiveAnswers;
        } else if (typeof userAnswer === 'object') {
          answerData.interactiveAnswers = userAnswer;
        }
      } else if (qType === 'free_text') {
        answerData.answerText = userAnswer?.textAnswer || (typeof userAnswer === 'string' ? userAnswer : '');
      }

      const result = await examsAPI.checkAnswer(attemptId, answerData);
      setCheckedQuestions(prev => ({
        ...prev,
        [itemIndex]: {
          checking: false,
          isCorrect: result.isCorrect,
          score: result.score,
          maxPoints: result.maxPoints,
          correctAnswer: result.correctAnswer,
          qType: result.qType || qType,
        },
      }));
    } catch (err) {
      console.error('Error checking answer:', err);
      setCheckedQuestions(prev => ({
        ...prev,
        [itemIndex]: { checking: false, error: true },
      }));
    }
  };

  // ✅ إنهاء قسم → GET /attempts/:attemptId/sections/:sectionKey/summary
  const handleFinishSection = async (sectionKey) => {
    if (!sectionKey) return;
    setSectionSummaries(prev => ({ ...prev, [sectionKey]: { loading: true } }));
    try {
      const data = await examsAPI.getSectionSummary(attemptId, sectionKey);
      setSectionSummaries(prev => ({ ...prev, [sectionKey]: { loading: false, data } }));
    } catch (err) {
      console.error('Error fetching section summary:', err);
      setSectionSummaries(prev => ({ ...prev, [sectionKey]: { loading: false, error: true } }));
    }
  };

  const handleSubmit = async () => {
    // ✅ التحقق من أن المحاولة لم يتم تسليمها بالفعل
    if (attempt?.status === 'submitted') {
      setError('تم تسليم هذا الامتحان بالفعل');
      navigate(`/student/attempt/${attemptId}/results`);
      return;
    }

    // ✅ إعادة تحميل المحاولة للتأكد من أحدث status (خاصة لقسم Schreiben)
    try {
      const examId = searchParams.get('examId');
      const latestAttempt = await examsAPI.getAttempt(attemptId, examId);

      if (latestAttempt?.status === 'submitted') {
        console.warn('⚠️ Attempt was already submitted - refreshing state');
        setAttempt(latestAttempt);
        setError('تم تسليم هذا الامتحان بالفعل');
        navigate(`/student/attempt/${attemptId}/results`);
        return;
      }
    } catch (refreshErr) {
      console.warn('⚠️ Could not refresh attempt status before submit:', refreshErr);
      // نستمر في submit حتى لو فشل refresh
    }

    // عرض تأكيد
    const confirmed = window.confirm(
      `هل أنت متأكد من تسليم الامتحان؟\n\n` +
      `عدد الأسئلة المجابة: ${Object.keys(answers).length} من ${attempt?.items?.length || 0}\n` +
      `بعد التسليم لن تتمكن من تعديل الإجابات.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      console.log('📤 Submitting attempt:', attemptId);
      console.log('📋 Answers to submit:', answers);

      // ✅ دالة مساعدة لتحويل إجابة من الـ state إلى صيغة الباك
      const formatAnswer = (questionId, qType, userAnswer, item) => {
        const answerObj = { questionId };

        if (!userAnswer) {
          // سؤال غير مجاب
          answerObj.selectedOptionIndexes = [];
          return answerObj;
        }

        if (qType === 'mcq') {
          if (userAnswer?.selectedIndex !== null && userAnswer?.selectedIndex !== undefined) {
            answerObj.selectedOptionIndexes = [userAnswer.selectedIndex];
          } else {
            answerObj.selectedOptionIndexes = [];
          }
        } else if (qType === 'true_false') {
          if (userAnswer?.studentAnswerBoolean !== undefined) {
            answerObj.selectedOptionIndexes = userAnswer.studentAnswerBoolean ? [0] : [1];
          } else {
            answerObj.selectedOptionIndexes = [];
          }
        } else if (qType === 'fill') {
          if (userAnswer?.fillAnswers && Array.isArray(userAnswer.fillAnswers)) {
            const fillExact = item?.fillExact || item?.questionSnapshot?.fillExact || item?.question?.fillExact || [];
            if (fillExact.length === 1) {
              answerObj.answerText = userAnswer.fillAnswers[0] || '';
            } else {
              answerObj.answerText = userAnswer.fillAnswers.filter(a => a && a.trim()).join(', ') || '';
            }
          } else if (userAnswer?.fillAnswer) {
            answerObj.answerText = userAnswer.fillAnswer;
          } else if (userAnswer?.studentAnswerText) {
            answerObj.answerText = userAnswer.studentAnswerText;
          } else if (typeof userAnswer === 'string') {
            answerObj.answerText = userAnswer;
          }
        } else if (qType === 'free_text') {
          answerObj.answerText = userAnswer?.textAnswer || (typeof userAnswer === 'string' ? userAnswer : '');
        } else if (qType === 'speaking') {
          answerObj.audioAnswerUrl = userAnswer?.audioAnswerUrl || userAnswer?.audioAnswer || (typeof userAnswer === 'string' ? userAnswer : '');
        } else if (qType === 'match') {
          answerObj.studentAnswerMatch = userAnswer?.studentAnswerMatch || userAnswer;
        } else if (qType === 'reorder') {
          answerObj.studentAnswerReorder = userAnswer?.studentAnswerReorder || (Array.isArray(userAnswer) ? userAnswer : undefined);
        } else if (qType === 'interactive_text') {
          if (userAnswer?.reorderAnswer) {
            answerObj.reorderAnswer = userAnswer.reorderAnswer;
          } else if (userAnswer?.interactiveAnswers) {
            answerObj.interactiveAnswers = userAnswer.interactiveAnswers;
          } else if (typeof userAnswer === 'object') {
            answerObj.interactiveAnswers = userAnswer;
          }
        }

        return answerObj;
      };

      // ✅ تجميع كل الإجابات: من attempt.items (بفهرس رقمي) + من أسئلة الأقسام (بمفتاح q-questionId)
      const answersArray = [];
      const processedIds = new Set();

      // 1) أسئلة من attempt.items
      (attempt.items || []).forEach((item, index) => {
        const questionId = item.questionId || item.question?.id || item.question?._id;
        if (!questionId || processedIds.has(questionId)) return;
        processedIds.add(questionId);

        const qType = item.qType || item.type || 'mcq';
        // الإجابة قد تكون بالفهرس الرقمي أو بالمفتاح q-questionId
        const userAnswer = answers[index] ?? answers[`q-${questionId}`];
        answersArray.push(formatAnswer(questionId, qType, userAnswer, item));
      });

      // 2) أسئلة من الأقسام (_fromSection) اللي مش موجودة بـ attempt.items
      Object.keys(answers).forEach((key) => {
        if (typeof key === 'string' && key.startsWith('q-')) {
          const questionId = key.replace('q-', '');
          if (processedIds.has(questionId)) return;
          processedIds.add(questionId);

          const userAnswer = answers[key];
          // محاولة معرفة نوع السؤال من الإجابة المحفوظة
          let qType = 'mcq';
          if (userAnswer?.studentAnswerText || userAnswer?.fillAnswer || userAnswer?.fillAnswers) qType = 'fill';
          else if (userAnswer?.studentAnswerBoolean !== undefined) qType = 'true_false';
          else if (userAnswer?.studentAnswerMatch) qType = 'match';
          else if (userAnswer?.studentAnswerReorder) qType = 'reorder';
          else if (userAnswer?.textAnswer) qType = 'free_text';
          else if (userAnswer?.audioAnswerUrl) qType = 'speaking';
          else if (userAnswer?.interactiveAnswers || userAnswer?.reorderAnswer) qType = 'interactive_text';

          answersArray.push(formatAnswer(questionId, qType, userAnswer, null));
        }
      });

      console.log('📤 Sending submit request with answers array:', answersArray);

      // إرسال طلب التسليم مع answers array
      const result = await examsAPI.submitAttempt(attemptId, answersArray);

      console.log('✅ Attempt submitted successfully:', result);
      console.log('📊 Score:', result.finalScore || result.score, '/', result.totalMaxScore || result.totalPoints);
      console.log('📈 Percentage:', (result.totalMaxScore || result.totalPoints) > 0
        ? Math.round(((result.finalScore || result.score) / (result.totalMaxScore || result.totalPoints)) * 100)
        : 0, '%');

      // الانتقال إلى صفحة النتائج
      navigate(`/student/attempt/${attemptId}/results`);
    } catch (err) {
      console.error('❌ Error submitting exam:', err);
      console.error('   Error response:', err.response?.data);
      console.error('   Error status:', err.response?.status);

      // ✅ معالجة خاصة لخطأ "Attempt is already submitted" (403)
      if (err.response?.status === 403) {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Attempt is already submitted';

        if (errorMessage.toLowerCase().includes('already submitted') ||
          errorMessage.toLowerCase().includes('submitted')) {
          console.error('⚠️ Attempt already submitted - this may indicate a caching or state issue');
          console.error('⚠️ Attempt ID:', attemptId);
          console.error('⚠️ Current attempt status:', attempt?.status);

          // ✅ إعادة تحميل المحاولة للتأكد من status
          try {
            const examId = searchParams.get('examId');
            const refreshedAttempt = await examsAPI.getAttempt(attemptId, examId);
            setAttempt(refreshedAttempt);

            if (refreshedAttempt?.status === 'submitted') {
              // المحاولة مقدمه بالفعل - الانتقال للنتائج
              alert('⚠️ تم تسليم هذا الامتحان مسبقاً. سيتم عرض النتائج.');
              navigate(`/student/attempt/${attemptId}/results`);
              return;
            }
          } catch (refreshErr) {
            console.error('❌ Could not refresh attempt after submit error:', refreshErr);
          }

          // إذا لم نتمكن من refresh، نعرض رسالة خطأ
          setError(
            '⚠️ يبدو أن المحاولة مقدمه مسبقاً.\n\n' +
            'إذا كنت طالب جديد أو لم تقدم هذا الامتحان من قبل، يرجى:\n' +
            '1. تسجيل الخروج والدخول مرة أخرى\n' +
            '2. مسح الـ cache والـ cookies\n' +
            '3. المحاولة مرة أخرى\n\n' +
            'إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني.'
          );
        } else {
          setError(errorMessage);
        }
      } else {
        // معالجة أخطاء أخرى
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          'حدث خطأ أثناء تسليم الامتحان. يرجى المحاولة مرة أخرى.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // استخدام عدد الأسئلة المنشورة من بيانات الأقسام إذا متوفرة (يجب أن يكون قبل أي return)
  const publishedTotal = useMemo(() => {
    if (!sectionsOverview?.length || !sectionExercises) return null;
    // انتظر حتى تحميل جميع الأقسام
    if (!sectionsOverview.every((s) => sectionExercises[s.key])) return null;
    const seenIds = new Set();
    // نفس منطق displayedItems: أقسام مرتبة → تمارين → أسئلة (بدون contentOnly وبدون تكرار)
    const sortedSections = [...sectionsOverview].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const section of sortedSections) {
      const sectionData = sectionExercises[section.key];
      if (!sectionData?.exercises) continue;
      for (const ex of sectionData.exercises) {
        for (const q of ex.questions || []) {
          if (q.contentOnly || !q.questionId) continue;
          seenIds.add(String(q.questionId));
        }
      }
    }
    return seenIds.size > 0 ? seenIds.size : null;
  }, [sectionExercises, sectionsOverview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-600">جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  // Schreiben exams don't have items - they have schreibenTaskId
  const isSchreibenExam = attempt?.mainSkill === 'schreiben' && attempt?.schreibenTaskId;
  // نعرض "لا توجد أسئلة" كصفحة كاملة فقط عند عدم وجود محاولة. إذا وجدت محاولة (حتى بدون أسئلة) نعرض الصفحة لتحميل الأقسام والمحتوى التعليمي
  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-6 mb-4">
            <p className="font-semibold mb-2">❌ لا توجد أسئلة في هذا الامتحان</p>
            <p className="text-xs text-slate-600">يرجى التواصل مع المدرس لإضافة الأسئلة</p>
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

  // Handle Schreiben exams - redirect directly to Schreiben page (no start screen)
  if (isSchreibenExam && !searchParams.get('showQuestions')) {
    const hasRegularQuestions = attempt.items && attempt.items.length > 0;
    const schreibenUrl = `/student/schreiben/${attempt.schreibenTaskId}?attemptId=${attempt.attemptId}${hasRegularQuestions ? '&hasQuestions=true&examAttemptId=' + attemptId : ''}`;
    // Use replace to avoid back button returning here and looping
    navigate(schreibenUrl, { replace: true });
    return null;
  }

  const attemptItems = attempt.items || [];
  const currentQuestion = attemptItems[currentQuestionIndex];
  // الـ fallback: استبعاد contentOnly من attemptItems حتى لو الأقسام ما حُمِّلت بعد
  const totalQuestions = publishedTotal || attemptItems.filter((i) => !i.contentOnly).length;
  const answeredCount = Object.keys(answers).length;

  // التحقق من أن المحاولة لم يتم تسليمها
  const isSubmitted = attempt.status === 'submitted';

  // Sections sidebar logic (currentSectionData و sectionQuestionIds معرّفان أعلاه قبل أي return)
  // hasSections: فقط إذا كان الامتحان يحتوي على أقسام حقيقية (غير _default)
  const hasSections = examHasRealSections && sectionsOverview && sectionsOverview.length > 0;
  const hasExercises = currentSectionData?.exercises?.length > 0;
  // هل تم تحميل بيانات جميع الأقسام؟ (لانتظار اكتمال التحميل قبل عرض "كل الأسئلة")
  // يشمل أيضاً الامتحانات بدون أقسام (_default section)
  const allSectionsLoaded = sectionsOverview && sectionsOverview.length > 0 && sectionsOverview.every((s) => sectionExercises[s.key]);
  // محتوى تعليمي: لا نعرض زر تسليم الامتحان ولا نذكر التسليم في التعليمات
  const isEducational = !!(attempt?.exam?.isEducational);

  // استبعاد الأسئلة الفارغة/الوهمية من كل العروض (نص "-" فقط أو خيار بدون نص/✓)
  const isEmptyQuestion = (item) => {
    if (!item) return true;
    if (item.contentOnly && !(item.promptSnapshot ?? item.prompt ?? item.text ?? '').toString().trim()) return true;
    const prompt = (item.promptSnapshot ?? item.prompt ?? item.text ?? '').toString().trim();
    const dashOnly = /^[\s\-–—ـ]+$/.test(prompt);
    const isEmptyPrompt = !prompt || prompt === '-' || prompt === '—' || dashOnly;
    const qType = (item.qType || item.type || '').toLowerCase();
    const isSpeakingOrFreeText = qType === 'speaking' || qType === 'free_text';
    const points = item.points ?? item.question?.points ?? item.questionData?.points ?? 1;
    const optsFromSafe = safeOptionsArray(item);
    const optsFromSnapshot = (item.optionsSnapshot && item.optionsSnapshot.map((o) => (o && o.text) || '')) || [];
    const opts = optsFromSafe.length ? optsFromSafe : optsFromSnapshot;
    const isOptionDashOrEmpty = isPlaceholderOptionText;
    const hasRealOption = Array.isArray(opts) && opts.some((t) => !isOptionDashOrEmpty(t));
    // سؤال نصه "-" فقط وبدون خيار حقيقي → إخفاء (مثل الصورة)
    if (isEmptyPrompt && !hasRealOption) return true;
    // أي سؤال كل خياراته وهمية (فارغة أو "-" أو "✓" فقط)
    if (Array.isArray(opts) && opts.length >= 1 && opts.every(isOptionDashOrEmpty)) return true;
    if (isEmptyPrompt && isSpeakingOrFreeText) return true;
    // فقط MCQ يحتاج options للعرض — الأنواع الأخرى (true_false, speaking, fill, match...) لها UI خاص
    const requiresOptions = ['mcq', 'multiple-choice'].includes(qType);
    const isMcqOrHasOptions = requiresOptions || opts.length > 0;
    if (isMcqOrHasOptions && !hasRealOption) return true;
    if (points === 0 && !hasRealOption) return true;
    // أسئلة الاختيار (MCQ) التي كان لها خيارات لكن كلها وهمية بعد التصفية → إخفاء (لا نطبق على speaking/free_text لأنها قد لا يكون لها خيارات أصلاً)
    const expectsOptions = ['mcq', 'multiple-choice'].includes(qType); // true_false لا يحتاج options
    if (expectsOptions && opts.length >= 1) {
      const { displayOptions } = getDisplayOptions(item);
      if (displayOptions.length === 0) return true;
    }
    return false;
  };

  // Filter items by selected section or exercise
  const displayedItems = (() => {
    // إذا كان تمرين مختار → عرض أسئلة التمرين فقط (من attempt أو من بيانات التمرين كـ fallback)
    if (selectedExercise && selectedExercise.questions && questionIdToItemIndex) {
      return selectedExercise.questions
        .map((q) => {
          const idx = questionIdToItemIndex.get(q.questionId);
          if (idx !== undefined && attempt.items[idx]) {
            // ✅ إذا العنصر موجود بـ attempt.items لكن بدون options، نضيف options من بيانات القسم
            const attemptItem = attempt.items[idx];
            const merged = { ...attemptItem, _attemptIndex: idx, ...(q.contentOnly && { contentOnly: true }) };
            const existingOptions = safeOptionsArray(attemptItem);
            if (existingOptions.length === 0 && Array.isArray(q.options) && q.options.length > 0) {
              return { ...merged, options: q.options };
            }
            // ✅ أسئلة Match: إذا الـ snapshot فاضي من أزواج/خيارات، استخدم بيانات القسم
            const isMatch = (merged.qType || merged.type || '').toLowerCase() === 'match';
            if (isMatch && (!merged.answerKeyMatch?.length) && (!merged.matchPairs?.length)) {
              return {
                ...merged,
                ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
                ...(q.matchPairs && { matchPairs: q.matchPairs }),
                ...(q.optionsText && { optionsText: q.optionsText }),
                ...(q.optionsSnapshot && { optionsSnapshot: q.optionsSnapshot }),
              };
            }
            return merged;
          }
          // عنصر غير موجود في attempt.items → استخدام بيانات السؤال من القسم للعرض
          const sectionKey = selectedSectionKey || selectedExercise.sectionKey;
          return {
            questionId: q.questionId,
            prompt: q.prompt,
            promptSnapshot: q.prompt,
            text: q.prompt,
            qType: q.qType || q.type || 'mcq',
            type: q.qType || q.type || 'mcq',
            options: q.options || [],
            images: q.images || [],
            points: q.points,
            ...(q.contentOnly && { contentOnly: true }),
            ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
            ...(q.matchPairs && { matchPairs: q.matchPairs }),
            ...(q.optionsText && { optionsText: q.optionsText }),
            ...(q.optionsSnapshot && { optionsSnapshot: q.optionsSnapshot }),
            sectionKey,
            section: sectionKey ? { key: sectionKey } : undefined,
            _fromSection: true,
          };
        })
        .filter(Boolean)
        .filter((item) => !isEmptyQuestion(item))
        .filter((item) => !item.contentOnly);
    }
    // إذا كان قسم مختار → عرض أسئلة القسم (تصفية حسب sectionKey أو حسب معرفات الأسئلة من API القسم)
    // يشمل أيضاً الامتحانات بدون أقسام (selectedSectionKey = '_default')
    if (selectedSectionKey && attempt?.items) {
      if (sectionQuestionIds && sectionQuestionIds.size > 0) {
        // أسئلة الـ attempt الموجودة في هذا القسم (المصدر الأساسي — يحتفظ ببيانات الطالب)
        const byIds = attempt.items
          .filter((item) => {
            const qid = item.questionId || item.id || item._id ||
              item.question?.id || item.question?._id ||
              item.questionSnapshot?.id || item.questionSnapshot?._id;
            return qid && sectionQuestionIds.has(qid);
          })
          .filter((item) => !isEmptyQuestion(item))
          .filter((item) => !item.contentOnly);

        // أسئلة القسم غير الموجودة في attempt (أُضيفت بعد بدء المحاولة)
        const byIdsSet = new Set(byIds.map((item) => {
          const qid = item.questionId || item.id || item._id ||
            item.question?.id || item.question?._id ||
            item.questionSnapshot?.id || item.questionSnapshot?._id;
          return qid ? String(qid) : null;
        }).filter(Boolean));

        const missingFromAttempt = [];
        (currentSectionData?.exercises || []).forEach((ex) => {
          (ex.questions || []).forEach((q) => {
            if (q.questionId && !byIdsSet.has(String(q.questionId))) {
              missingFromAttempt.push({
                questionId: q.questionId,
                prompt: q.prompt,
                promptSnapshot: q.prompt,
                text: q.prompt,
                qType: q.qType || q.type || 'mcq',
                type: q.qType || q.type || 'mcq',
                options: q.options || [],
                images: q.images || [],
                points: q.points,
                ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
                ...(q.matchPairs && { matchPairs: q.matchPairs }),
                ...(q.optionsText && { optionsText: q.optionsText }),
                ...(q.optionsSnapshot && { optionsSnapshot: q.optionsSnapshot }),
                sectionKey: selectedSectionKey,
                section: { key: selectedSectionKey },
                _fromSection: true,
              });
            }
          });
        });

        const combined = [...byIds, ...missingFromAttempt.filter((item) => !isEmptyQuestion(item) && !item.contentOnly)];
        if (combined.length > 0) return combined;

        // fallback: إذا ما وُجدت أسئلة في attempt → عرض من تعريف القسم مباشرة
        const fromSection = [];
        (currentSectionData?.exercises || []).forEach((ex) => {
          (ex.questions || []).forEach((q) => {
            if (q.contentOnly) return;
            fromSection.push({
              questionId: q.questionId,
              prompt: q.prompt,
              promptSnapshot: q.prompt,
              text: q.prompt,
              qType: q.qType || q.type || 'mcq',
              type: q.qType || q.type || 'mcq',
              options: q.options || [],
              images: q.images || [],
              points: q.points,
              ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
              ...(q.matchPairs && { matchPairs: q.matchPairs }),
              ...(q.optionsText && { optionsText: q.optionsText }),
              ...(q.optionsSnapshot && { optionsSnapshot: q.optionsSnapshot }),
              sectionKey: selectedSectionKey,
              section: { key: selectedSectionKey },
              _fromSection: true,
            });
          });
        });
        return fromSection.filter((item) => !isEmptyQuestion(item));
      }
      return attempt.items
        .filter((item) => {
          const itemSectionKey = item.sectionKey || item.section?.key;
          return itemSectionKey === selectedSectionKey;
        })
        .filter((item) => !isEmptyQuestion(item))
        .filter((item) => !item.contentOnly);
    }
    // عرض كل الأسئلة: مباشرة من تعريف الأقسام (Teil 1 → Teil 2 → ...)
    // يشمل أيضاً الامتحانات بدون أقسام (sectionsOverview يحتوي على _default)
    if (sectionsOverview && sectionsOverview.length > 0) {
      if (!allSectionsLoaded) return []; // الأقسام لا تزال تُحمّل → الـ spinner يظهر
      const allItems = [];
      const seenQIds = new Set();
      const sortedSections = [...sectionsOverview].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const section of sortedSections) {
        const sectionData = sectionExercises[section.key];
        if (!sectionData?.exercises) continue;
        for (const exercise of sectionData.exercises) {
          const questions = exercise.questions || [];
          let exerciseHasItems = false;
          for (const q of questions) {
            if (!q.questionId) continue; // تخطي الأسئلة بدون ID
            const qId = String(q.questionId);
            if (seenQIds.has(qId)) continue; // تخطي التكرارات
            seenQIds.add(qId);
            exerciseHasItems = true;

            // ✅ contentOnly: نضيفها للعرض (المحتوى التعليمي)
            if (q.contentOnly) {
              allItems.push({
                questionId: q.questionId,
                prompt: q.prompt,
                promptSnapshot: q.prompt,
                text: q.prompt,
                qType: q.qType || q.type || 'mcq',
                type: q.qType || q.type || 'mcq',
                options: [],
                images: q.images || [],
                points: 0,
                contentOnly: true,
                sectionKey: section.key,
                section: { key: section.key },
                _fromSection: true,
              });
              continue;
            }

            // جرب تجيب السؤال من attempt.items (عشان الإجابات محفوظة)
            const idx = questionIdToItemIndex.get(qId);
            if (idx !== undefined && attempt?.items[idx]) {
              allItems.push(attempt.items[idx]);
            } else {
              // سؤال أُضيف بعد بدء المحاولة → ابنيه من بيانات القسم
              allItems.push({
                questionId: q.questionId,
                prompt: q.prompt,
                promptSnapshot: q.prompt,
                text: q.prompt,
                qType: q.qType || q.type || 'mcq',
                type: q.qType || q.type || 'mcq',
                options: q.options || [],
                images: q.images || [],
                points: q.points,
                ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
                ...(q.matchPairs && { matchPairs: q.matchPairs }),
                ...(q.optionsText && { optionsText: q.optionsText }),
                ...(q.optionsSnapshot && { optionsSnapshot: q.optionsSnapshot }),
                sectionKey: section.key,
                section: { key: section.key },
                _fromSection: true,
              });
            }
          }

          // ✅ تمرين بدون أسئلة لكن فيه محتوى تعليمي (audio/reading/contentBlocks) → ننشئ عنصر وهمي لعرض المحتوى
          if (!exerciseHasItems && (exercise.audioUrl || exercise.readingPassage || (exercise.readingCards && exercise.readingCards.length > 0) || (exercise.contentBlocks && exercise.contentBlocks.length > 0) || exercise.title)) {
            const virtualId = `virtual-ex-${section.key}-${exercise.exerciseIndex ?? exercise.exerciseNumber ?? Math.random()}`;
            allItems.push({
              questionId: virtualId,
              prompt: '',
              promptSnapshot: '',
              text: '',
              options: [],
              points: 0,
              contentOnly: true,
              sectionKey: section.key,
              section: { key: section.key },
              _fromSection: true,
              _virtualExercise: exercise, // مرجع للتمرين لعرض المحتوى
            });
          }
        }
      }
      return allItems.filter((item) => item.contentOnly || !isEmptyQuestion(item));
    }
    // fallback: بدون أقسام أو قبل تحميلها
    return (attempt.items || []).filter((item) => !isEmptyQuestion(item));
  })();

  // Calculate per-section progress from local answers
  // كل تمرين (Übung) = وحدة واحدة — التمرين "مكتمل" لما تُجاب كل أسئلته الحقيقية
  const getSectionProgress = (sectionKey) => {
    const sectionData = sectionExercises[sectionKey];
    const exercises = sectionData?.exercises || [];

    if (exercises.length > 0) {
      const total = exercises.length; // كل تمرين = 1
      let answered = 0;
      exercises.forEach((ex) => {
        const realQs = (ex.questions || []).filter((q) => !q.contentOnly);
        if (realQs.length === 0) return;
        const allDone = realQs.every((q) => {
          const idx = questionIdToItemIndex?.get(q.questionId);
          return idx !== undefined && answers[idx] !== undefined;
        });
        if (allDone) answered++;
      });
      return { answered, total };
    }

    // fallback: بيانات القسم لم تُحمّل بعد → استخدام sectionKey
    const sectionItems = (attempt?.items || []).filter((item) => {
      const itemSectionKey = item.sectionKey || item.section?.key;
      return itemSectionKey === sectionKey;
    });
    const total = sectionItems.length;
    let answered = 0;
    sectionItems.forEach((item) => {
      const idx = attempt.items.indexOf(item);
      if (answers[idx] !== undefined) answered++;
    });
    return { answered, total };
  };

  const SKILL_ICONS = { hoeren: '🎧', lesen: '📖', schreiben: '✍️', sprechen: '🗣️', sprachbausteine: '🧩' };

  return (
    <div className="exam-page min-h-screen bg-slate-50" data-exam-css-version="text-fix-v1">
      {/* الشريط العلوي */}
      <div className={`${hasSections ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-3 sm:px-4 pt-4 sm:pt-8 pb-2`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← رجوع
          </button>
          <span className="text-xs font-semibold text-red-600 truncate max-w-[200px]">
            {attempt.exam?.title || 'امتحان'}
          </span>
        </div>

        {/* عنوان الامتحان */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
            {attempt.exam?.title || 'امتحان'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {totalQuestions} سؤال
          </p>
        </div>
      </div>

      <div className={`${hasSections ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-3 sm:px-4 pb-8`}>
        {/* Sections - Mobile: horizontal tabs, Desktop: sidebar */}
        {hasSections && (
          <>
            {/* Mobile: horizontal scrollable tabs */}
            <div className="md:hidden mb-4 -mx-3 px-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {/* زر "كل الأسئلة" في الموبايل */}
                {!isEducational && (
                  <button
                    onClick={() => { setSelectedSectionKey(null); setSelectedExercise(null); }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${selectedSectionKey === null
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                  >
                    <span>📋</span>
                    <span>كل الأسئلة</span>
                    <span className="text-[10px] opacity-75">{answeredCount}/{totalQuestions}</span>
                  </button>
                )}
                {sectionsOverview.map((section) => {
                  const progress = getSectionProgress(section.key);
                  const isActive = selectedSectionKey === section.key;
                  const isComplete = progress.total > 0 && progress.answered === progress.total;

                  return (
                    <button
                      key={section.key}
                      onClick={() => { setSelectedSectionKey(section.key); setSelectedExercise(null); }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${isActive
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                    >
                      <span>{SKILL_ICONS[section.skill] || '📄'}</span>
                      <span className="max-w-[120px] text-left leading-tight">{section.title}</span>
                      <span className="text-[10px] opacity-75">
                        {progress.answered}/{progress.total}
                        {isComplete && ' ✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className={`${hasSections ? 'md:flex md:gap-6' : ''}`}>
          {/* Desktop sidebar */}
          {hasSections && (
            <aside className="hidden md:block w-64 flex-shrink-0 sticky top-4 self-start">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">أقسام الامتحان</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {answeredCount}/{totalQuestions} سؤال تمت الإجابة عليه
                  </p>
                </div>
                <div className="p-2 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* زر "كل الأسئلة" — يظهر كل أسئلة الامتحان ويتيح التسليم */}
                  {!isEducational && (
                    <button
                      onClick={() => { setSelectedSectionKey(null); setSelectedExercise(null); }}
                      className={`w-full text-right p-3 rounded-xl text-xs transition-all mb-1 ${selectedSectionKey === null
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative flex-shrink-0">
                          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.5" fill="none"
                              stroke={answeredCount === totalQuestions && totalQuestions > 0 ? '#22c55e' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0} ${totalQuestions > 0 ? 100 - Math.round((answeredCount / totalQuestions) * 100) : 100}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[11px]">📋</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold leading-tight ${selectedSectionKey === null ? 'text-red-700' : 'text-slate-800'}`}>
                            كل الأسئلة
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {answeredCount}/{totalQuestions} سؤال
                          </div>
                        </div>
                        {answeredCount === totalQuestions && totalQuestions > 0 && (
                          <span className="text-green-500 text-sm flex-shrink-0">●</span>
                        )}
                      </div>
                    </button>
                  )}
                  <div className="border-t border-slate-100 my-1" />
                  {sectionsOverview
                    .filter((section) => getSectionProgress(section.key).total > 0)
                    .map((section) => {
                    const progress = getSectionProgress(section.key);
                    const isActive = selectedSectionKey === section.key;
                    const progressPercent = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;
                    const isComplete = progress.total > 0 && progress.answered === progress.total;

                    return (
                      <button
                        key={section.key}
                        onClick={() => { setSelectedSectionKey(section.key); setSelectedExercise(null); }}
                        className={`w-full text-right p-3 rounded-xl text-xs transition-all ${isActive
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative flex-shrink-0">
                            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                              <circle
                                cx="18" cy="18" r="15.5" fill="none"
                                stroke={isComplete ? '#22c55e' : '#ef4444'}
                                strokeWidth="3"
                                strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px]">
                              {SKILL_ICONS[section.skill] || '📄'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold leading-tight ${isActive ? 'text-red-700' : 'text-slate-800'}`}>
                              {section.title}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {progress.answered}/{progress.total} سؤال
                              {section.timeLimitMin > 0 && ` • ${section.timeLimitMin}د`}
                            </div>
                          </div>
                          {sectionSummaries[section.key]?.data ? (
                            <span className="text-green-500 text-sm flex-shrink-0" title="تم إنهاء القسم">✓</span>
                          ) : isComplete ? (
                            <span className="text-yellow-500 text-sm flex-shrink-0" title="تمت الإجابة على الكل">●</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 exam-main-content">

            {/* رسالة خطأ */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                {error}
              </div>
            )}

            {/* رسالة إذا تم التسليم - إظهار فقط الرسالة بدون الأسئلة */}
            {isSubmitted ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-6 text-center">
                <p className="font-semibold mb-2 text-lg">⚠️ تم تسليم هذا الامتحان</p>
                <p className="text-sm mb-4">لا يمكنك تعديل الإجابات</p>
                <button
                  onClick={() => navigate(`/student/attempt/${attemptId}/results`)}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-semibold"
                >
                  عرض النتائج
                </button>
              </div>
            ) : (
              <>
                {/* نص القراءة - يظهر مرة واحدة فوق الأسئلة */}
                {attempt.readingText && (
                  <div className="reading-text-card bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="exam-reading-content leading-relaxed bg-white rounded-lg p-3 sm:p-4 border border-amber-100" dir="ltr">
                      <ReadingPassageContent text={attempt.readingText.content} />
                    </div>
                  </div>
                )}

                {/* Section title when filtering */}
                {hasSections && selectedSectionKey && !selectedExercise && (() => {
                  const activeSection = sectionsOverview.find(s => s.key === selectedSectionKey);
                  if (!activeSection) return null;
                  return (
                    <div className="bg-white rounded-xl border border-slate-100 p-3 sm:p-4 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl">{SKILL_ICONS[activeSection.skill] || '📄'}</span>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">{activeSection.title}</h2>
                        <p className="text-[10px] sm:text-xs text-slate-500">
                          {hasExercises
                            ? `${currentSectionData.exercises.length} تمرين`
                            : `${displayedItems.filter(i => !i.contentOnly).length} سؤال`}
                          {activeSection.timeLimitMin > 0 && ` • ${activeSection.timeLimitMin} دقيقة`}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* ✅ وضع التمارين: عرض قائمة التمارين */}
                {hasSections && selectedSectionKey && hasExercises && !selectedExercise && !loadingExercises && (
                  <ExercisesList
                    exercises={currentSectionData.exercises}
                    onSelectExercise={setSelectedExercise}
                    answers={answers}
                    questionIdToItemIndex={questionIdToItemIndex}
                  />
                )}

                {/* ✅ تحميل التمارين */}
                {loadingExercises && (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm text-slate-500">جاري تحميل التمارين...</p>
                  </div>
                )}

                {/* ✅ وضع التمرين المختار: عنوان التمرين + زر رجوع + صوت */}
                {selectedExercise && (
                  <div className="mb-6">
                    <button
                      onClick={() => setSelectedExercise(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors mb-3 inline-block"
                    >
                      ← العودة لقائمة التمارين
                    </button>
                    <div className="bg-white rounded-xl border border-slate-100 p-3 sm:p-4 mb-3 sm:mb-4">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Übung {selectedExercise.exerciseIndex ?? selectedExercise.exerciseNumber}
                      </h2>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                        {selectedExercise.questionCount || selectedExercise.questions?.length || 0} سؤال
                      </p>
                    </div>
                    {/* مشغل صوت التمرين */}
                    {selectedExercise.audioUrl && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 block">
                          🎵 ملف الاستماع
                        </span>
                        <audio
                          controls
                          controlsList="nodownload"
                          preload="metadata"
                          src={toApiUrl(selectedExercise.audioUrl)}
                          className="w-full"
                        >
                          المتصفح لا يدعم تشغيل الملفات الصوتية
                        </audio>
                      </div>
                    )}
                    {/* فقرة القراءة المشتركة للتمرين - لون الخلفية من الإدارة */}
                    {selectedExercise.readingPassage && (
                      <div
                        className="rounded-xl p-3 sm:p-5 mb-3 sm:mb-4 border"
                        style={{
                          backgroundColor: selectedExercise.readingPassageBgColor || '#fefce8',
                          borderColor: selectedExercise.readingPassageBgColor ? `${selectedExercise.readingPassageBgColor}cc` : '#fde68a',
                        }}
                      >
                        <div className="exam-reading-content leading-relaxed rounded-lg p-3 sm:p-4" dir="ltr">
                          <ReadingPassageContent text={selectedExercise.readingPassage} />
                        </div>
                      </div>
                    )}
                    {selectedExercise.readingCards && selectedExercise.readingCards.length > 0 && (
                      <ReadingCardsGrid cards={selectedExercise.readingCards} cardsLayout={selectedExercise.cardsLayout} />
                    )}
                    {/* عرض كل المحتوى في الأعلى فقط عندما لا يوجد بلوك "questions" (لا interleaving)؛ وإلا يُعرض المحتوى مرة واحدة فقط قبل/بعد كل سؤال عبر blockDist */}
                    {selectedExercise.contentBlocks && selectedExercise.contentBlocks.length > 0 && (() => {
                      const blockType = (b) => b.blockType || b.type;
                      const hasQuestionsBlock = selectedExercise.contentBlocks.some(b => blockType(b) === 'questions');
                      if (hasQuestionsBlock) return null;
                      const blocksWithoutQuestions = selectedExercise.contentBlocks.filter(b => blockType(b) !== 'questions');
                      if (blocksWithoutQuestions.length === 0) return null;
                      return <ContentBlocksRenderer blocks={blocksWithoutQuestions} />;
                    })()}
                  </div>
                )}

                {/* تحميل: "كل الأسئلة" بانتظار اكتمال جلب بيانات الأقسام */}
                {hasSections && !selectedSectionKey && !allSectionsLoaded && (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-slate-500">جاري تحميل جميع الأسئلة...</p>
                  </div>
                )}

                {/* عرض الأسئلة - لا تعرض إذا كان هناك تمارين ولم يتم اختيار تمرين */}
                {!(hasSections && selectedSectionKey && hasExercises && !selectedExercise) && !loadingExercises && (hasSections ? allSectionsLoaded || !!selectedSectionKey : true) && (
                  <>
                    <div className="space-y-6 mb-6">
                      {(() => {
                        // تتبع أي تمرين تم عرض صوته بالفعل (لعدم التكرار في "كل الأسئلة")
                        const shownExerciseIds = new Set();

                        // حساب توزيع بلوكات المحتوى بين الأسئلة (interleaving)
                        const exBlocks = selectedExercise?.contentBlocks || [];
                        const bt = (b) => b.blockType || b.type;
                        const hasQSlots = exBlocks.some(b => bt(b) === 'questions');
                        let blockDist = null;
                        if (hasQSlots) {
                          const sorted = [...exBlocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                          const beforeMap = {};
                          let qOffset = 0;
                          let pending = [];
                          for (const block of sorted) {
                            if (bt(block) === 'questions') {
                              if (pending.length > 0) {
                                beforeMap[qOffset] = pending;
                                pending = [];
                              }
                              qOffset += (block.questionCount || 1);
                            } else {
                              pending.push(block);
                            }
                          }
                          blockDist = { beforeMap, trailing: pending };
                        }

                        let visibleQuestionCounter = 0;
                        const items = displayedItems.map((item, displayIndex) => {
                          // Get the global index for this item (for answers tracking); للعناصر من القسم (_fromSection) نستخدم مفتاحاً بالـ questionId
                          const rawItemIndex = item._attemptIndex !== undefined ? item._attemptIndex : attempt.items.indexOf(item);
                          const itemIndex = item._fromSection ? `q-${item.questionId}` : rawItemIndex;
                          // ✅ ترقيم الأسئلة بدون contentOnly
                          if (!item.contentOnly) visibleQuestionCounter++;
                          const displayNumber = visibleQuestionCounter;
                          const itemOverride = item._fromSection ? item : undefined;

                          // ✅ في "كل الأسئلة": عرض صوت/قراءة التمرين فوق أول سؤال لكل تمرين
                          const qId = item.questionId || item.id || item._id || item.question?.id || item.question?._id || item.questionSnapshot?.id || item.questionSnapshot?._id;
                          let exerciseInfo = qId ? questionExerciseMap.get(String(qId)) : null;

                          // ✅ للعناصر الوهمية (_virtualExercise): نبني exerciseInfo من بيانات التمرين مباشرة
                          if (!exerciseInfo && item._virtualExercise) {
                            const vex = item._virtualExercise;
                            exerciseInfo = {
                              audioUrl: vex.audioUrl,
                              readingPassage: vex.readingPassage,
                              readingPassageBgColor: vex.readingPassageBgColor,
                              readingCards: vex.readingCards,
                              cardsLayout: vex.cardsLayout,
                              contentBlocks: vex.contentBlocks,
                              title: vex.title,
                              exerciseIndex: vex.exerciseIndex ?? vex.exerciseNumber,
                              exerciseId: `ex-${vex.exerciseIndex ?? vex.exerciseNumber}-${vex.title || ''}`,
                            };
                          }

                          const isAllQuestionsMode = !selectedSectionKey && !selectedExercise;
                          // عرض بطاقة العنوان (Übung X) لأول سؤال من كل تمرين دائماً — حتى لو التمرين بدون صوت/فقرة/بطاقات (نفس السلوك في كل الأقسام)
                          let showExerciseHeader = false;
                          if (isAllQuestionsMode && exerciseInfo?.exerciseId && !shownExerciseIds.has(exerciseInfo.exerciseId)) {
                            showExerciseHeader = true;
                            shownExerciseIds.add(exerciseInfo.exerciseId);
                          }

                          // صوت السؤال (من question.media أو mediaSnapshot)
                          const questionMedia = item.question?.media || item.questionSnapshot?.media;
                          const questionMediaUrl = questionMedia?.url;
                          const questionMediaType = questionMedia?.type || (questionMediaUrl ? 'audio' : null);

                          const questionAudio = (questionMediaType === "audio")
                            ? questionMediaUrl
                            : (item.mediaSnapshot?.type === "audio"
                              ? (item.mediaSnapshot.url || item.mediaSnapshot.key || null)
                              : null);

                          // عرض صوت السؤال فقط إذا الـ exercise ما عنده صوت مشترك وما عنده صوت تمرين
                          const exerciseHasAudio = !!selectedExercise?.audioUrl || (isAllQuestionsMode && !!exerciseInfo?.audioUrl);
                          const shouldShowQuestionAudio = !!questionAudio && !exerciseHasAudio;

                          // قراءة prompt بأمان (يتحمل قيم غريبة مثل "9"9" أو object)
                          const qType = item.qType || item.question?.qType || item.questionSnapshot?.qType || item.type || 'mcq';
                          const prompt =
                            safePromptString(item.promptSnapshot) ||
                            safePromptString(item.prompt) ||
                            safePromptString(item.text) ||
                            'لا يوجد نص للسؤال';

                          // قراءة options بأمان (لا نستدعي .map إلا على مصفوفات)
                          const options = safeOptionsArray(item);

                          // ✅ استخدام معرف فريد للسؤال (questionId أو id) بدلاً من itemIndex
                          // ✅ إضافة itemIndex للتأكد من التفرد حتى لو كان questionId متكرراً
                          const questionId = item.questionId || item.id || item._id || item.question?.id || item.question?._id || item.questionSnapshot?.id || item.questionSnapshot?._id;
                          const uniqueKey = questionId ? `${questionId}-${itemIndex}` : `item-${itemIndex}`;

                          // ✅ تخطي عرض أسئلة contentOnly كأسئلة (placeholder فقط) - نعرض بس content blocks
                          if (item.contentOnly) {
                            return (
                              <div key={uniqueKey}>
                                {/* ✅ عنوان التمرين + صوت/قراءة مشتركة في "كل الأسئلة" (contentOnly) */}
                                {showExerciseHeader && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-800 text-left" dir="ltr">
                                      Übung {exerciseInfo.exerciseIndex}
                                    </h3>
                                    {exerciseInfo.audioUrl && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <span className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 block">🎵 ملف الاستماع</span>
                                        <audio controls controlsList="nodownload" preload="metadata" src={toApiUrl(exerciseInfo.audioUrl)} className="w-full">
                                          المتصفح لا يدعم تشغيل الملفات الصوتية
                                        </audio>
                                      </div>
                                    )}
                                    {exerciseInfo.readingPassage && (
                                      <div
                                        className="rounded-lg p-3 border"
                                        style={{
                                          backgroundColor: exerciseInfo.readingPassageBgColor || '#fefce8',
                                          borderColor: exerciseInfo.readingPassageBgColor ? `${exerciseInfo.readingPassageBgColor}cc` : '#fde68a',
                                        }}
                                      >
                                        <div className="exam-reading-content text-xs sm:text-sm text-slate-700 leading-relaxed rounded-lg p-3" dir="ltr">
                                          <ReadingPassageContent text={exerciseInfo.readingPassage} />
                                        </div>
                                      </div>
                                    )}
                                    {exerciseInfo.readingCards && exerciseInfo.readingCards.length > 0 && (
                                      <ReadingCardsGrid cards={exerciseInfo.readingCards} cardsLayout={exerciseInfo.cardsLayout} />
                                    )}
                                    {/* في "كل الأسئلة" لا يوجد blockDist (selectedExercise = null) فنعرض كل المحتوى مرة واحدة في العنوان */}
                                    {!blockDist && exerciseInfo.contentBlocks && exerciseInfo.contentBlocks.length > 0 && (() => {
                                      const blockType = (b) => b.blockType || b.type;
                                      const blocksNoQ = exerciseInfo.contentBlocks.filter(b => blockType(b) !== 'questions');
                                      if (blocksNoQ.length === 0) return null;
                                      return <ContentBlocksRenderer blocks={blocksNoQ} />;
                                    })()}
                                  </div>
                                )}
                                {blockDist && blockDist.beforeMap[displayIndex] && (
                                  <ContentBlocksRenderer blocks={blockDist.beforeMap[displayIndex]} />
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={uniqueKey} className="space-y-4">
                              {/* بلوكات محتوى مدمجة قبل هذا السؤال (interleaving) */}
                              {blockDist && blockDist.beforeMap[displayIndex] && (
                                <ContentBlocksRenderer blocks={blockDist.beforeMap[displayIndex]} />
                              )}
                              {/* ✅ عنوان التمرين + صوت/قراءة/بلوكات مشتركة في "كل الأسئلة" */}
                              {showExerciseHeader && exerciseInfo && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">
                                  <h3 className="text-sm sm:text-base font-bold text-slate-800 text-left" dir="ltr">
                                    Übung {exerciseInfo.exerciseIndex}
                                  </h3>
                                  {exerciseInfo.audioUrl && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <span className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 block">🎵 ملف الاستماع</span>
                                      <audio controls controlsList="nodownload" preload="metadata" src={toApiUrl(exerciseInfo.audioUrl)} className="w-full">
                                        المتصفح لا يدعم تشغيل الملفات الصوتية
                                      </audio>
                                    </div>
                                  )}
                                  {exerciseInfo.readingPassage && (
                                    <div
                                      className="rounded-lg p-3 border"
                                      style={{
                                        backgroundColor: exerciseInfo.readingPassageBgColor || '#fefce8',
                                        borderColor: exerciseInfo.readingPassageBgColor ? `${exerciseInfo.readingPassageBgColor}cc` : '#fde68a',
                                      }}
                                    >
                                      <div className="exam-reading-content text-xs sm:text-sm text-slate-700 leading-relaxed rounded-lg p-3" dir="ltr">
                                        <ReadingPassageContent text={exerciseInfo.readingPassage} />
                                      </div>
                                    </div>
                                  )}
                                  {exerciseInfo.readingCards && exerciseInfo.readingCards.length > 0 && (
                                    <ReadingCardsGrid cards={exerciseInfo.readingCards} cardsLayout={exerciseInfo.cardsLayout} />
                                  )}
                                  {/* في "كل الأسئلة" لا يوجد blockDist فنعرض كل المحتوى مرة واحدة في العنوان؛ مع blockDist نعتمد على beforeMap/trailing فقط */}
                                  {!blockDist && exerciseInfo.contentBlocks && exerciseInfo.contentBlocks.length > 0 && (() => {
                                    const blockType = (b) => b.blockType || b.type;
                                    const blocksNoQ = exerciseInfo.contentBlocks.filter(b => blockType(b) !== 'questions');
                                    if (blocksNoQ.length === 0) return null;
                                    return <ContentBlocksRenderer blocks={blocksNoQ} />;
                                  })()}
                                </div>
                              )}

                              {/* تخطي عرض السؤال إذا كان محتوى فقط (contentOnly) */}
                              {(item.contentOnly || item.question?.contentOnly || item.questionSnapshot?.contentOnly || (prompt === '—' && item.points === 0)) ? null : <>
                                {/* ✅ Audio Player - فقط إذا كان السؤال له صوت خاص به (مختلف عن صوت الـ Section) */}
                                {shouldShowQuestionAudio && (() => {
                                  // ✅ استخدام questionAudio (من question.media.url مباشرة)
                                  const audioUrlToUse = questionAudio;
                                  if (!audioUrlToUse) return null;

                                  // ✅ إذا كان من question.media.url، استخدمه مباشرة (لا حاجة لتحويل)
                                  // ✅ إذا كان من mediaSnapshot، استخدم toApiUrl للتحويل
                                  const isFromQuestionMedia = questionMediaUrl && questionMediaType === "audio";
                                  const mediaSrc = isFromQuestionMedia
                                    ? audioUrlToUse  // ✅ استخدام question.media.url مباشرة
                                    : toApiUrl(audioUrlToUse);  // Fallback: تحويل mediaSnapshot

                                  // ✅ إصلاح mime type لملفات .opus
                                  const correctMime = getCorrectMimeType(
                                    audioUrlToUse,
                                    isFromQuestionMedia ? questionMedia?.mime : item.mediaSnapshot?.mime
                                  );

                                  return (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs sm:text-sm font-semibold text-blue-700">
                                          🎵 ملف صوتي خاص بالسؤال
                                        </span>
                                      </div>
                                      <audio src={mediaSrc} controls controlsList="nodownload" className="w-full">
                                        <source src={mediaSrc} type={correctMime} />
                                        المتصفح لا يدعم تشغيل الملفات الصوتية
                                      </audio>
                                    </div>
                                  );
                                })()}

                                {/* عرض السؤال */}
                                <div className="exam-question-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
                                  {/* رقم السؤال */}
                                  <div className="flex items-center gap-2 mb-3 sm:mb-4 justify-end">
                                    <span className="text-xs font-semibold px-2 py-1 bg-red-600 text-white rounded">
                                      سؤال {displayNumber}
                                    </span>
                                    {item.points && (
                                      <span className="text-[10px] text-slate-400">
                                        {item.points} نقطة
                                      </span>
                                    )}
                                  </div>

                                  {/* Media (Audio/Image/Video) - من question.media.url مباشرة */}
                                  {/* Media (Audio/Image/Video) */}
                                  {(() => {
                                    // ✅ استخدام question.media.url مباشرة (الحل الصحيح)
                                    // أولوية: question.media.url > questionSnapshot.media.url > بناء من mediaSnapshot.key > mediaSnapshot.url (fallback)
                                    const questionMedia = item.question?.media || item.questionSnapshot?.media;
                                    let questionMediaUrl = questionMedia?.url;
                                    const questionMediaType = questionMedia?.type;

                                    // ✅ إذا لم يكن question.media.url موجود، نحاول بناء اللينك من mediaSnapshot.key
                                    // لأن mediaSnapshot.key يحتوي على المسار الصحيح: "images/questions/....jpg"
                                    // واللينك الصحيح يكون: "https://api.deutsch-tests.com/uploads/images/questions/....jpg"
                                    if (!questionMediaUrl && item.mediaSnapshot?.key) {
                                      const mediaKey = item.mediaSnapshot.key;
                                      // ✅ بناء اللينك الصحيح من key مع encoding صحيح
                                      // mediaKey يكون مثل: "images/questions/سؤال 70 عام.jpg"
                                      // اللينك الصحيح: "https://api.deutsch-tests.com/uploads/images/questions/%D8%B3%D8%A4%D8%A7%D9%84%2070%20%D8%B9%D8%A7%D9%85.jpg"
                                      questionMediaUrl = buildImageUrlFromKey(mediaKey);
                                      console.log('✅ Built URL from mediaSnapshot.key:', {
                                        key: mediaKey,
                                        builtUrl: questionMediaUrl
                                      });
                                    }

                                    const finalMediaType = questionMediaType || item.mediaSnapshot?.type || (questionMediaUrl ? 'image' : null);

                                    // Debug: طباعة معلومات media المتاحة
                                    console.log(`🖼️ Question ${itemIndex + 1} Media Debug:`, {
                                      hasQuestion: !!item.question,
                                      hasQuestionSnapshot: !!item.questionSnapshot,
                                      questionMedia: item.question?.media,
                                      questionSnapshotMedia: item.questionSnapshot?.media,
                                      questionMediaUrl: questionMedia?.url,
                                      finalQuestionMediaUrl: questionMediaUrl,
                                      finalMediaType,
                                      mediaSnapshot: item.mediaSnapshot,
                                      itemKeys: Object.keys(item)
                                    });

                                    // عرض صوت السؤال إذا كان موجوداً (الصوت الآن في mediaSnapshot لكل سؤال)
                                    const shouldShowQuestionAudioForOldLogic = finalMediaType === "audio" && !!questionMediaUrl && !exerciseHasAudio;

                                    // Fallback: mediaSnapshot (إذا لم يكن هناك question.media)
                                    const mediaSnapshot = item.mediaSnapshot;
                                    const hasMediaSnapshot = mediaSnapshot && mediaSnapshot.type && mediaSnapshot.url && !questionMediaUrl;

                                    // ✅ معالجة imagesSnapshot - إذا كان هناك عدة صور
                                    // نستخدم متغير خارجي لحفظ الصور لعرضها بعد نص السؤال
                                    const imagesSnapshot = item.imagesSnapshot || [];
                                    const hasMultipleImages = imagesSnapshot.length > 0;

                                    console.log('🖼️ Processing images for question:', {
                                      itemIndex,
                                      hasImagesSnapshot: !!item.imagesSnapshot,
                                      imagesSnapshotLength: imagesSnapshot.length,
                                      imagesSnapshot: imagesSnapshot,
                                      hasQuestionMedia: !!questionMedia,
                                      hasMediaSnapshot: !!item.mediaSnapshot
                                    });

                                    // ✅ بناء map من جميع المصادر المحتملة للبحث عن description
                                    // 1. question.images أو questionSnapshot.images
                                    // 2. item.images مباشرة
                                    // 3. item.question.media أو item.questionSnapshot.media
                                    const questionImagesMap = new Map(); // key -> image object with description

                                    // المصدر 1: question.images أو questionSnapshot.images
                                    const questionImages = item.question?.images || item.questionSnapshot?.images || [];

                                    // المصدر 2: item.images مباشرة (قد يكون موجود في محاولة الامتحان)
                                    const itemImages = item.images || [];

                                    // المصدر 3: item.question.media أو item.questionSnapshot.media (لصورة واحدة)
                                    // ✅ questionMedia تم تعريفه بالفعل في السطر 1223، لا نحتاج لإعادة تعريفه

                                    console.log('🔍 Looking for description sources:', {
                                      itemIndex,
                                      hasQuestion: !!item.question,
                                      hasQuestionSnapshot: !!item.questionSnapshot,
                                      questionImages: item.question?.images,
                                      questionSnapshotImages: item.questionSnapshot?.images,
                                      itemImages: item.images,
                                      questionMedia: questionMedia,
                                      questionImagesArray: questionImages,
                                      questionImagesLength: questionImages.length,
                                      itemImagesLength: itemImages.length
                                    });

                                    // إضافة من question.images
                                    if (Array.isArray(questionImages) && questionImages.length > 0) {
                                      questionImages.forEach((img) => {
                                        const imgKey = img.key || img.url;
                                        if (imgKey) {
                                          questionImagesMap.set(imgKey, img);
                                          console.log('✅ Added from question.images:', {
                                            key: imgKey,
                                            hasDescription: !!img.description,
                                            description: img.description
                                          });
                                        }
                                      });
                                    }

                                    // إضافة من item.images (إذا لم يكن موجود بالفعل)
                                    if (Array.isArray(itemImages) && itemImages.length > 0) {
                                      itemImages.forEach((img) => {
                                        const imgKey = img.key || img.url;
                                        if (imgKey && !questionImagesMap.has(imgKey)) {
                                          questionImagesMap.set(imgKey, img);
                                          console.log('✅ Added from item.images:', {
                                            key: imgKey,
                                            hasDescription: !!img.description,
                                            description: img.description
                                          });
                                        }
                                      });
                                    }

                                    // إضافة من question.media (لصورة واحدة)
                                    if (questionMedia && questionMedia.type === 'image' && questionMedia.key) {
                                      const mediaKey = questionMedia.key;
                                      if (!questionImagesMap.has(mediaKey)) {
                                        questionImagesMap.set(mediaKey, questionMedia);
                                        console.log('✅ Added from question.media:', {
                                          key: mediaKey,
                                          hasDescription: !!questionMedia.description,
                                          description: questionMedia.description
                                        });
                                      }
                                    }

                                    console.log('📝 Final questionImagesMap:', {
                                      questionImagesMapSize: questionImagesMap.size,
                                      questionImagesMapKeys: Array.from(questionImagesMap.keys()),
                                      allDescriptions: Array.from(questionImagesMap.values()).map(img => ({
                                        key: img.key || img.url,
                                        description: img.description
                                      }))
                                    });

                                    // ✅ بناء قائمة بجميع الصور بالأولوية الصحيحة:
                                    // 1. imagesSnapshot (إذا كان موجود وله طول > 0) - الأولوية الأولى
                                    // 2. images (إذا كان موجود وله طول > 0)
                                    // 3. mediaSnapshot
                                    // 4. media (questionMediaUrl)
                                    const imageMap = new Map(); // key -> image object

                                    // ✅ الأولوية الأولى: imagesSnapshot
                                    if (hasMultipleImages && imagesSnapshot.length > 0) {
                                      imagesSnapshot.forEach((imgSnapshot, idx) => {
                                        console.log(`🖼️ Processing image ${idx} from imagesSnapshot (RAW FROM API):`, {
                                          imgSnapshot,
                                          isString: typeof imgSnapshot === 'string',
                                          isObject: typeof imgSnapshot === 'object',
                                          type: imgSnapshot?.type,
                                          hasKey: !!imgSnapshot?.key,
                                          hasUrl: !!imgSnapshot?.url,
                                          key: imgSnapshot?.key,
                                          url: imgSnapshot?.url,
                                          fullSnapshot: JSON.stringify(imgSnapshot)
                                        });

                                        // ✅ معالجة الحالات المختلفة: string, object بدون type, object مع type
                                        let imgKey, imgUrl, imgMime;

                                        if (typeof imgSnapshot === 'string') {
                                          // إذا كان string، نعتبره key مباشرة
                                          imgKey = imgSnapshot;
                                          // ✅ استخدام دالة buildImageUrlFromKey لعمل encoding صحيح
                                          imgUrl = buildImageUrlFromKey(imgKey);
                                          imgMime = 'image/jpeg';
                                          console.log('✅ Building URL from string key:', {
                                            key: imgKey,
                                            builtUrl: imgUrl
                                          });
                                        } else if (typeof imgSnapshot === 'object' && imgSnapshot !== null) {
                                          // ✅ التحقق من type - قد يكون 'image' أو غير موجود (نعتبره image افتراضياً)
                                          const isImage = !imgSnapshot.type || imgSnapshot.type === 'image';
                                          if (!isImage) {
                                            console.log(`⏭️ Skipping non-image type: ${imgSnapshot.type}`);
                                            return; // تخطي إذا لم يكن image
                                          }

                                          // ✅ استخدام key مباشرة من imagesSnapshot بدون أي تعديل
                                          // هذا هو key الصحيح من API: "images/ولايات/Thüringenسؤال1صورة1.jpeg"
                                          imgKey = imgSnapshot.key;
                                          if (!imgKey) {
                                            console.warn('⚠️ Image snapshot missing key:', imgSnapshot);
                                            return; // تخطي إذا لم يكن هناك key
                                          }

                                          // ✅ التحقق من أن key لم يتم تعديله
                                          console.log(`🔑 Using key DIRECTLY from imagesSnapshot[${idx}]:`, {
                                            originalKey: imgSnapshot.key,
                                            keyToUse: imgKey,
                                            areEqual: imgSnapshot.key === imgKey,
                                            keyLength: imgKey.length
                                          });

                                          imgMime = imgSnapshot.mime || 'image/jpeg';

                                          // ✅ التحقق من صحة url - يجب أن ينتهي بامتداد صورة صحيح
                                          const isValidUrl = (url) => {
                                            if (!url) return false;
                                            // التحقق من أن URL ينتهي بامتداد صورة صحيح
                                            const imageExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
                                            const hasValidExtension = imageExtensions.some(ext =>
                                              url.toLowerCase().endsWith(ext)
                                            );
                                            // التحقق من أن URL يبدأ بـ http أو https
                                            const hasValidProtocol = url.startsWith('http://') || url.startsWith('https://');
                                            // التحقق من أن URL ليس مقطوعاً (أطول من 50 حرف على الأقل)
                                            const isNotTruncated = url.length > 50;

                                            return hasValidExtension && hasValidProtocol && isNotTruncated;
                                          };

                                          // ✅ إذا كان url موجوداً وصحيحاً، استخدمه
                                          // وإلا بني URL من key (key أكثر موثوقية من url المشوه)
                                          if (imgSnapshot.url && isValidUrl(imgSnapshot.url)) {
                                            imgUrl = toApiUrl(imgSnapshot.url);
                                            console.log('✅ Using valid url from imagesSnapshot:', imgUrl);
                                          } else {
                                            // ✅ بناء URL من key مع encoding صحيح
                                            // key يكون مثل: "images/ولايات/Rheinland-Pfalz1سؤال صورة.jpeg"
                                            // URL الصحيح: "https://api.deutsch-tests.com/uploads/images/%D9%88%D9%84%D8%A7%D9%8A%D8%A7%D8%AA/..."
                                            // ✅ استخدام دالة buildImageUrlFromKey لعمل encoding صحيح على كل segment
                                            imgUrl = buildImageUrlFromKey(imgKey);
                                            console.log('✅ Building URL from key (url was invalid/truncated):', {
                                              key: imgKey,
                                              builtUrl: imgUrl,
                                              originalUrl: imgSnapshot.url
                                            });
                                          }
                                        } else {
                                          // حالة غير متوقعة
                                          console.warn('⚠️ Unexpected image snapshot format:', imgSnapshot);
                                          return;
                                        }

                                        // ✅ تجنب إضافة الصورة إذا كانت موجودة بالفعل
                                        if (!imageMap.has(imgKey)) {
                                          // ✅ البحث عن description في question.images أو questionSnapshot.images
                                          // لأن imagesSnapshot قد لا يحتوي على description
                                          const questionImage = questionImagesMap.get(imgKey);
                                          const imageDescription = imgSnapshot.description || questionImage?.description || null;

                                          console.log(`📝 Description lookup for image ${idx}:`, {
                                            key: imgKey,
                                            fromSnapshot: imgSnapshot.description,
                                            questionImageFound: !!questionImage,
                                            questionImage: questionImage,
                                            fromQuestion: questionImage?.description,
                                            finalDescription: imageDescription,
                                            questionImagesMapSize: questionImagesMap.size,
                                            questionImagesMapKeys: Array.from(questionImagesMap.keys())
                                          });

                                          imageMap.set(imgKey, {
                                            url: imgUrl,
                                            key: imgKey,
                                            type: 'image',
                                            mime: imgMime,
                                            description: imageDescription // ✅ استخدام description من imagesSnapshot أو question.images
                                          });
                                        }
                                      });
                                    }

                                    // ✅ الأولوية الثانية: images (إذا لم يكن imagesSnapshot موجود أو فارغ)
                                    if (imageMap.size === 0 && item.images && Array.isArray(item.images) && item.images.length > 0) {
                                      console.log('📸 Using images array (imagesSnapshot was empty):', item.images);
                                      item.images.forEach((img, idx) => {
                                        const imgKey = img.key || img.url || `image_${idx}`;
                                        const imgUrl = img.url || (img.key ? buildImageUrlFromKey(img.key) : null);
                                        if (imgUrl && !imageMap.has(imgKey)) {
                                          // ✅ البحث عن description في question.images
                                          const questionImage = questionImagesMap.get(imgKey);
                                          const imageDescription = img.description || questionImage?.description || null;

                                          imageMap.set(imgKey, {
                                            url: imgUrl,
                                            key: imgKey,
                                            type: 'image',
                                            mime: img.mime || 'image/jpeg',
                                            description: imageDescription // ✅ استخدام description من images أو question.images
                                          });
                                        }
                                      });
                                    }

                                    // ✅ الأولوية الثالثة: mediaSnapshot (إذا لم يكن هناك صور بعد)
                                    if (imageMap.size === 0 && item.mediaSnapshot?.type === 'image' && item.mediaSnapshot?.key) {
                                      console.log('📸 Using mediaSnapshot (no imagesSnapshot or images):', item.mediaSnapshot);
                                      const mediaKey = item.mediaSnapshot.key;
                                      const builtUrl = buildImageUrlFromKey(mediaKey);
                                      // ✅ البحث عن description في question.images أو question.media
                                      const questionImage = questionImagesMap.get(mediaKey);
                                      const questionMedia = item.question?.media || item.questionSnapshot?.media;
                                      const imageDescription = item.mediaSnapshot.description || questionImage?.description || questionMedia?.description || null;

                                      imageMap.set(mediaKey, {
                                        url: builtUrl,
                                        key: mediaKey,
                                        type: 'image',
                                        mime: item.mediaSnapshot.mime,
                                        description: imageDescription // ✅ استخدام description من mediaSnapshot أو question.images أو question.media
                                      });
                                    }

                                    // ✅ الأولوية الرابعة: media (questionMediaUrl) - إذا لم يكن هناك صور بعد
                                    if (imageMap.size === 0 && questionMediaUrl && finalMediaType === 'image') {
                                      console.log('📸 Using questionMediaUrl (no other images found):', questionMediaUrl);
                                      const mediaKey = questionMedia?.key || item.mediaSnapshot?.key;
                                      if (mediaKey) {
                                        // ✅ البحث عن description في question.images أو question.media
                                        const questionImage = questionImagesMap.get(mediaKey);
                                        const imageDescription = questionMedia?.description || questionImage?.description || item.mediaSnapshot?.description || null;

                                        imageMap.set(mediaKey, {
                                          url: questionMediaUrl,
                                          key: mediaKey,
                                          type: 'image',
                                          mime: questionMedia?.mime || item.mediaSnapshot?.mime,
                                          description: imageDescription // ✅ استخدام description من questionMedia أو question.images أو mediaSnapshot
                                        });
                                      }
                                    }

                                    // تحويل Map إلى array وحفظه في item للاستخدام لاحقاً
                                    const allImages = Array.from(imageMap.values());
                                    // ✅ حفظ الصور في item للاستخدام بعد نص السؤال
                                    item._allImages = allImages;

                                    console.log('📸 Final images resolution:', {
                                      itemIndex,
                                      source: hasMultipleImages && imagesSnapshot.length > 0 ? 'imagesSnapshot' :
                                        (item.images && item.images.length > 0 ? 'images' :
                                          (item.mediaSnapshot?.type === 'image' ? 'mediaSnapshot' : 'media')),
                                      allImagesCount: allImages.length
                                    });

                                    console.log('📸 All images processed for question:', {
                                      itemIndex,
                                      allImagesCount: allImages.length,
                                      allImages: allImages,
                                      imagesSnapshotCount: imagesSnapshot.length
                                    });

                                    // ✅ استخدام question.media.url مباشرة (الحل الصحيح)
                                    if (questionMediaUrl) {
                                      // ✅ استخدام question.media.url مباشرة - لا حاجة لتحويل أو معالجة
                                      const mediaSrc = questionMediaUrl;

                                      console.log('✅ Using question.media.url (or built from key):', {
                                        url: mediaSrc,
                                        type: finalMediaType,
                                        source: questionMedia?.url ? 'question.media' : 'built from mediaSnapshot.key',
                                        allImagesCount: allImages.length,
                                        imagesSnapshotCount: imagesSnapshot.length
                                      });

                                      if (finalMediaType === 'audio' && mediaSrc && !exerciseHasAudio && !shouldShowQuestionAudio) {
                                        // ✅ إصلاح mime type لملفات .opus
                                        const correctMime = getCorrectMimeType(mediaSrc, questionMedia?.mime || item.mediaSnapshot?.mime);
                                        return (
                                          <div className="mb-4">
                                            <audio controls controlsList="nodownload" style={{ width: '100%' }}>
                                              <source src={mediaSrc} type={correctMime} />
                                              متصفحك لا يدعم تشغيل الصوت.
                                            </audio>
                                          </div>
                                        );
                                      } else if (finalMediaType === 'image' && mediaSrc) {
                                        // ✅ الصور سنعرضها بعد نص السؤال، لا هنا
                                        // نرجع null هنا لأننا سنعرض الصور لاحقاً
                                        return null;
                                      } else if (finalMediaType === 'video' && mediaSrc) {
                                        return (
                                          <div className="mb-4">
                                            <video controls className="w-full">
                                              <source src={mediaSrc} type={questionMedia?.mime || item.mediaSnapshot?.mime || 'video/mp4'} />
                                              متصفحك لا يدعم تشغيل الفيديو.
                                            </video>
                                          </div>
                                        );
                                      }
                                    }

                                    // ✅ إذا لم يكن questionMediaUrl موجود لكن imagesSnapshot موجود
                                    // الصور سنعرضها بعد نص السؤال، لا هنا
                                    if (allImages.length > 0 && !questionMediaUrl) {
                                      console.log('✅ Using images from imagesSnapshot (will show after question text):', {
                                        allImagesCount: allImages.length,
                                        imagesSnapshotCount: imagesSnapshot.length
                                      });
                                      // نرجع null هنا لأننا سنعرض الصور لاحقاً
                                      return null;
                                    }

                                    // Fallback: استخدام mediaSnapshot - فقط إذا لم يكن هناك question.media
                                    const shouldShowMediaSnapshot = hasMediaSnapshot && (
                                      mediaSnapshot.type === 'image' ||
                                      mediaSnapshot.type === 'video' ||
                                      mediaSnapshot.type === 'audio'
                                    );

                                    if (shouldShowMediaSnapshot) {
                                      // الحصول على المسار من url أو key
                                      const rawMediaPath = mediaSnapshot.url || mediaSnapshot.key || '';

                                      // ✅ استخدام toApiUrl لتحويل URL النسبي إلى full URL
                                      const mediaSrc = toApiUrl(rawMediaPath);

                                      console.log('⚠️ Fallback to mediaSnapshot:', {
                                        raw: rawMediaPath,
                                        resolved: mediaSrc,
                                        type: mediaSnapshot.type
                                      });

                                      if (mediaSnapshot.type === 'audio' && mediaSrc && !exerciseHasAudio && !shouldShowQuestionAudio) {
                                        // ✅ إصلاح mime type لملفات .opus
                                        const correctMime = getCorrectMimeType(rawMediaPath, mediaSnapshot.mime);
                                        return (
                                          <div className="mb-4">
                                            <audio controls controlsList="nodownload" style={{ width: '100%' }}>
                                              <source src={mediaSrc} type={correctMime} />
                                              متصفحك لا يدعم تشغيل الصوت.
                                            </audio>
                                          </div>
                                        );
                                      } else if (mediaSnapshot.type === 'image' && mediaSrc) {
                                        // ✅ الصور سنعرضها بعد نص السؤال، لا هنا
                                        // نضيف الصورة إلى allImages إذا لم تكن موجودة
                                        if (!item._allImages) {
                                          item._allImages = [];
                                        }
                                        const imgKey = mediaSnapshot.key || rawMediaPath;
                                        if (!item._allImages.find(img => img.key === imgKey)) {
                                          // ✅ البحث عن description في question.images أو question.media
                                          const questionImage = questionImagesMap.get(imgKey);
                                          const questionMedia = item.question?.media || item.questionSnapshot?.media;
                                          const imageDescription = mediaSnapshot.description || questionImage?.description || questionMedia?.description || null;

                                          item._allImages.push({
                                            url: mediaSrc,
                                            key: imgKey,
                                            type: 'image',
                                            mime: mediaSnapshot.mime,
                                            description: imageDescription // ✅ استخدام description من mediaSnapshot أو question.images أو question.media
                                          });
                                        }
                                        return null;
                                      } else if (mediaSnapshot.type === 'video' && mediaSrc) {
                                        return (
                                          <div className="mb-4">
                                            <video controls className="w-full">
                                              <source src={mediaSrc} type={mediaSnapshot.mime || 'video/mp4'} />
                                              متصفحك لا يدعم تشغيل الفيديو.
                                            </video>
                                          </div>
                                        );
                                      }
                                    }

                                    return null;
                                  })()}

                                  {/* نص السؤال */}
                                  {/* ✅ Interactive Text: عرض interactiveText مع placeholders أو Reorder */}
                                  {qType === 'interactive_text' && (() => {
                                    // ✅ التحقق من نوع المهمة: Reorder أو Fill-in-the-blanks
                                    const interactiveReorderSnapshot = item.interactiveReorderSnapshot || item.interactiveReorder;
                                    const taskType = item.taskType || (interactiveReorderSnapshot ? 'reorder' : 'fill_blanks');

                                    // ✅ Reorder Task
                                    if (taskType === 'reorder' && interactiveReorderSnapshot?.parts && interactiveReorderSnapshot.parts.length > 0) {
                                      return (
                                        <ReorderTask
                                          parts={interactiveReorderSnapshot.parts}
                                          prompt={prompt}
                                          itemIndex={itemIndex}
                                          answers={answers}
                                          setAnswers={setAnswers}
                                          saveAnswer={(idx, qid, ans) => saveAnswer(idx, qid, ans, itemOverride)}
                                          isSubmitted={isSubmitted}
                                          questionId={item.questionId}
                                        />
                                      );
                                    }

                                    // ✅ Fill-in-the-blanks Task
                                    // ✅ قراءة interactiveTextSnapshot و interactiveBlanksSnapshot من item (من الباك)
                                    // ⚠️ مهم: نقرأ فقط من interactiveTextSnapshot و interactiveBlanksSnapshot (من الباك)
                                    // لا نستخدم fallback إلى item.text لأن هذا قد يسبب عرض السؤال مرتين
                                    const interactiveText =
                                      item.interactiveTextSnapshot ||  // الحقل الأساسي من الباك
                                      item.interactiveText ||
                                      item.question?.interactiveText ||
                                      item.questionSnapshot?.interactiveText ||
                                      '';

                                    // ✅ قراءة interactiveBlanksSnapshot من item (من الباك)
                                    const interactiveBlanks =
                                      item.interactiveBlanksSnapshot ||  // الحقل الأساسي من الباك
                                      item.interactiveBlanks ||
                                      item.question?.interactiveBlanks ||
                                      item.questionSnapshot?.interactiveBlanks ||
                                      [];

                                    // Debug: طباعة البيانات
                                    console.log('🔍 Interactive Text Debug:', {
                                      itemIndex,
                                      qType,
                                      taskType,
                                      prompt,
                                      interactiveText,
                                      interactiveBlanks,
                                      hasInteractiveTextSnapshot: !!item.interactiveTextSnapshot,
                                      hasInteractiveBlanksSnapshot: !!item.interactiveBlanksSnapshot,
                                      hasInteractiveReorderSnapshot: !!item.interactiveReorderSnapshot,
                                      itemKeys: Object.keys(item),
                                    });

                                    // ⚠️ إذا لم يكن هناك interactiveTextSnapshot أو interactiveBlanksSnapshot، نعرض رسالة خطأ واضحة
                                    if (!item.interactiveTextSnapshot && !item.interactiveBlanksSnapshot) {
                                      console.error('❌ Interactive Text missing snapshots from backend:', {
                                        itemIndex,
                                        hasInteractiveTextSnapshot: !!item.interactiveTextSnapshot,
                                        hasInteractiveBlanksSnapshot: !!item.interactiveBlanksSnapshot,
                                        itemKeys: Object.keys(item),
                                      });
                                      return (
                                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                                          <h3 className="text-lg font-semibold text-slate-900 mb-2" dir="ltr">
                                            {prompt}
                                          </h3>
                                          <p className="text-sm text-yellow-800">
                                            ⚠️ البيانات التفاعلية غير متوفرة. يرجى التحقق من إعدادات السؤال في لوحة التحكم.
                                          </p>
                                        </div>
                                      );
                                    }

                                    // عرض prompt مع الاحتفاظ بالأسطر الفارغة (دعم \n و \r\n)
                                    const promptLines = (prompt || '').split(/\r?\n/);
                                    const promptElement = prompt && interactiveText ? (
                                      <div className="mb-6 mt-2" dir="ltr">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                          {promptLines.map((line, i) => (
                                            <span key={i}>
                                              {line}
                                              {i < promptLines.length - 1 && <br />}
                                            </span>
                                          ))}
                                        </h3>
                                      </div>
                                    ) : null;

                                    if (!interactiveText || interactiveBlanks.length === 0) {
                                      // Fallback: عرض prompt فقط
                                      console.warn('⚠️ Interactive Text missing data:', {
                                        hasInteractiveText: !!interactiveText,
                                        interactiveBlanksLength: interactiveBlanks.length,
                                        hasInteractiveTextSnapshot: !!item.interactiveTextSnapshot,
                                        hasInteractiveBlanksSnapshot: !!item.interactiveBlanksSnapshot,
                                      });
                                      return (
                                        <div className="mb-4">
                                          {prompt && (
                                            <div className="mb-6 mt-2" dir="ltr">
                                              <h3 className="text-lg font-semibold text-slate-900">
                                                {(prompt || '').split(/\r?\n/).map((line, i, arr) => (
                                                  <span key={i}>
                                                    {line}
                                                    {i < arr.length - 1 && <br />}
                                                  </span>
                                                ))}
                                              </h3>
                                            </div>
                                          )}
                                          <p className="text-sm text-slate-600">
                                            ⚠️ لا يوجد نص تفاعلي متاح
                                          </p>
                                        </div>
                                      );
                                    }

                                    // تقسيم النص على placeholders {{a}}, {{b}}, إلخ
                                    const parts = [];
                                    const placeholderRegex = /\{\{([a-j])\}\}/g;
                                    let match;
                                    let lastIndex = 0;

                                    while ((match = placeholderRegex.exec(interactiveText)) !== null) {
                                      // إضافة النص قبل placeholder
                                      if (match.index > lastIndex) {
                                        parts.push({
                                          type: 'text',
                                          content: interactiveText.substring(lastIndex, match.index),
                                        });
                                      }

                                      // إضافة placeholder
                                      const blankId = match[1];
                                      const blank = interactiveBlanks.find(b => b.id === blankId);
                                      if (blank) {
                                        parts.push({
                                          type: 'blank',
                                          id: blankId,
                                          blank: blank,
                                        });
                                      } else {
                                        // إذا لم نجد blank، نعرض placeholder كما هو
                                        parts.push({
                                          type: 'text',
                                          content: match[0],
                                        });
                                      }

                                      lastIndex = match.index + match[0].length;
                                    }

                                    // إضافة النص المتبقي
                                    if (lastIndex < interactiveText.length) {
                                      parts.push({
                                        type: 'text',
                                        content: interactiveText.substring(lastIndex),
                                      });
                                    }

                                    return (
                                      <div className="mb-4">
                                        {/* ✅ عرض prompt فقط إذا كان مختلفاً عن interactiveText */}
                                        {/* ⚠️ لا نعرض promptElement إذا كان interactiveText موجوداً لأنه يحتوي على السؤال بالفعل */}
                                        {prompt && prompt !== interactiveText && promptElement}

                                        {/* عرض interactiveText مع placeholders — تدفق عادي (نص وقوائم على نفس السطر كما في لوحة التحكم) */}
                                        <div className="text-lg font-semibold text-slate-900 mb-3 mt-1 interactive-text-blanks" dir="ltr">
                                          <div className="leading-8">
                                            {parts.map((part, partIndex) => {
                                              if (part.type === 'text') {
                                                const content = part.content || '';
                                                const hasHtml = /<[^>]+>/.test(content);
                                                if (hasHtml) {
                                                  return (
                                                    <span key={partIndex} className="inline" dangerouslySetInnerHTML={{ __html: content }} />
                                                  );
                                                }
                                                const lines = content.split('\n');
                                                return (
                                                  <span key={partIndex} className="inline">
                                                    {lines.map((line, i) => (
                                                      <span key={i}>
                                                        {line}
                                                        {i < lines.length - 1 && <br />}
                                                      </span>
                                                    ))}
                                                  </span>
                                                );
                                              } else {
                                                const blank = part.blank;
                                                const currentAnswer = answers[itemIndex]?.interactiveAnswers?.[blank.id] ?? '';
                                                const blankOptions = blank.options || blank.choices || [];

                                                if (blank.type === 'dropdown' && blankOptions.length > 0) {
                                                  return (
                                                    <span key={partIndex} className="inline-flex align-middle mx-1">
                                                      <select
                                                        value={currentAnswer}
                                                        disabled={isSubmitted}
                                                        onChange={(e) => {
                                                          const newAnswers = { ...answers };
                                                          if (!newAnswers[itemIndex]) {
                                                            newAnswers[itemIndex] = { interactiveAnswers: {} };
                                                          }
                                                          if (!newAnswers[itemIndex].interactiveAnswers) {
                                                            newAnswers[itemIndex].interactiveAnswers = {};
                                                          }
                                                          newAnswers[itemIndex].interactiveAnswers[blank.id] = e.target.value;
                                                          setAnswers(newAnswers);
                                                          saveAnswer(itemIndex, item.questionId, {
                                                            ...newAnswers[itemIndex],
                                                            interactiveAnswers: newAnswers[itemIndex].interactiveAnswers,
                                                          }, itemOverride);
                                                        }}
                                                        className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 min-w-[110px] text-base"
                                                      >
                                                        <option value="">-- اختر --</option>
                                                        {blankOptions.map((option, optionIndex) => (
                                                          <option key={optionIndex} value={option}>
                                                            {option}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    </span>
                                                  );
                                                } else {
                                                  return (
                                                    <span key={partIndex} className="inline-flex align-middle mx-1">
                                                      <input
                                                        type="text"
                                                        value={currentAnswer ?? ""}
                                                        disabled={isSubmitted}
                                                        onChange={(e) => {
                                                          const newAnswers = { ...answers };
                                                          if (!newAnswers[itemIndex]) {
                                                            newAnswers[itemIndex] = { interactiveAnswers: {} };
                                                          }
                                                          if (!newAnswers[itemIndex].interactiveAnswers) {
                                                            newAnswers[itemIndex].interactiveAnswers = {};
                                                          }
                                                          newAnswers[itemIndex].interactiveAnswers[blank.id] = e.target.value;
                                                          setAnswers(newAnswers);
                                                          saveAnswer(itemIndex, item.questionId, {
                                                            ...newAnswers[itemIndex],
                                                            interactiveAnswers: newAnswers[itemIndex].interactiveAnswers,
                                                          }, itemOverride);
                                                        }}
                                                        placeholder={blank.hint || `فراغ ${blank.id.toUpperCase()}`}
                                                        className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 min-w-[120px] text-base"
                                                      />
                                                    </span>
                                                  );
                                                }
                                              }
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* ✅ Fill in the Blank: استخدام fillExact لتحديد عدد الفراغات */}
                                  {qType === 'fill' ? (
                                    <div className="text-lg font-semibold text-slate-900 mb-3 mt-2" dir="ltr">
                                      {(() => {
                                        // ✅ قراءة fillExact من item (من الباك)
                                        const fillExact = item.fillExact || item.questionSnapshot?.fillExact || item.question?.fillExact || [];
                                        // ✅ تحديد عدد الفراغات بناءً على fillExact.length
                                        const inputsCount = fillExact?.length || 1;

                                        // ✅ قراءة الإجابات المحفوظة (fillAnswer أو fillAnswers)
                                        const savedAnswers = answers[itemIndex]?.fillAnswers ||
                                          (answers[itemIndex]?.fillAnswer ? [answers[itemIndex].fillAnswer] : []);

                                        // ✅ تقسيم النص على ___ (3 underscores) أو استخدام fillExact.length
                                        // نحاول تقسيم على ___ أولاً، وإذا لم نجد نستخدم fillExact.length
                                        const blankPattern = /_{2,}/; // يبحث عن _ متكررة (2 أو أكثر)
                                        let parts = [];

                                        if (blankPattern.test(prompt)) {
                                          // إذا وجدنا ___ في النص، نقسم عليه
                                          parts = prompt.split(blankPattern);
                                        } else {
                                          // إذا لم نجد ___، نستخدم fillExact.length لتقسيم النص
                                          // نقسم النص إلى inputsCount + 1 جزء
                                          const textLength = prompt.length;
                                          const partLength = Math.floor(textLength / (inputsCount + 1));
                                          parts = [];
                                          for (let i = 0; i < inputsCount + 1; i++) {
                                            parts.push(prompt.substring(i * partLength, (i + 1) * partLength));
                                          }
                                        }

                                        // ✅ التأكد من أن parts.length = inputsCount + 1
                                        while (parts.length < inputsCount + 1) {
                                          parts.push('');
                                        }

                                        return (
                                          <span className="inline-flex items-baseline gap-0 flex-wrap" style={{ display: 'inline' }}>
                                            {parts.map((part, partIndex) => (
                                              <React.Fragment key={`${uniqueKey}-part-${partIndex}`}>
                                                <span>{part}</span>
                                                {partIndex < inputsCount && (
                                                  <input
                                                    key={`${uniqueKey}-fill-input-${partIndex}`}
                                                    type="text"
                                                    value={savedAnswers[partIndex] ?? ""}
                                                    disabled={isSubmitted}
                                                    onChange={(e) => {
                                                      const newValue = e.target.value;
                                                      // ✅ حفظ الإجابة في fillAnswers array
                                                      const newAnswers = { ...answers };
                                                      if (!newAnswers[itemIndex]) {
                                                        newAnswers[itemIndex] = { fillAnswers: [] };
                                                      }
                                                      if (!newAnswers[itemIndex].fillAnswers) {
                                                        newAnswers[itemIndex].fillAnswers = [];
                                                      }
                                                      // ✅ تحديث الإجابة في الفهرس المحدد
                                                      newAnswers[itemIndex].fillAnswers[partIndex] = newValue;
                                                      // ✅ التأكد من أن array بنفس طول fillExact
                                                      while (newAnswers[itemIndex].fillAnswers.length < inputsCount) {
                                                        newAnswers[itemIndex].fillAnswers.push('');
                                                      }
                                                      setAnswers(newAnswers);

                                                      // ✅ حفظ الإجابة
                                                      clearTimeout(window.saveTimeout);
                                                      window.saveTimeout = setTimeout(() => {
                                                        saveAnswer(itemIndex, item.questionId, {
                                                          fillAnswers: newAnswers[itemIndex].fillAnswers
                                                        }, itemOverride);
                                                      }, 1000);
                                                    }}
                                                    className="inline-input-fill"
                                                    style={{
                                                      display: 'inline-block',
                                                      border: 'none',
                                                      borderBottom: '2px solid #e63946',
                                                      padding: '2px 8px',
                                                      margin: '0 4px',
                                                      fontSize: 'inherit',
                                                      lineHeight: 'inherit',
                                                      minWidth: '60px',
                                                      maxWidth: '200px',
                                                      width: `${Math.max(60, ((savedAnswers[partIndex] || '').length + 1) * 12)}px`,
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
                                                  />
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  ) : qType === 'interactive_text' ? null : (
                                    // ✅ لا نعرض prompt هنا لـ interactive_text لأنه يعرض داخل كود interactive_text
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-2" dir="ltr">
                                      {prompt}
                                    </h3>
                                  )}

                                  {/* ✅ عرض الصور بعد نص السؤال وقبل الخيارات */}
                                  {(() => {
                                    const imagesToShow = item._allImages || [];
                                    console.log('🖼️ Rendering images for question:', {
                                      itemIndex,
                                      hasAllImages: !!item._allImages,
                                      imagesCount: imagesToShow.length,
                                      images: imagesToShow,
                                      imagesWithDescriptions: imagesToShow.map(img => ({
                                        key: img.key,
                                        url: img.url,
                                        hasDescription: !!img.description,
                                        description: img.description
                                      }))
                                    });

                                    if (imagesToShow.length > 0) {
                                      return (
                                        <div className="mb-4" dir="ltr">
                                          {imagesToShow.length > 1 ? (
                                            <div className="flex flex-wrap gap-4 justify-center">
                                              {imagesToShow.map((img, imgIndex) => {
                                                // ✅ الـ URL تم بناءه بالفعل مع encoding صحيح من buildImageUrlFromKey
                                                // لا نحتاج encoding إضافي هنا
                                                return (
                                                  <div key={imgIndex} className="flex flex-col items-center">
                                                    <img
                                                      src={img.url}
                                                      alt={`Question image ${imgIndex + 1}`}
                                                      className="max-w-[120px] w-auto h-auto rounded-lg border border-slate-200 object-contain"
                                                      onError={(e) => {
                                                        const imgElement = e.target;
                                                        const error = imgElement.error;
                                                        let errorMessage = 'Unknown error';
                                                        let errorCode = null;

                                                        if (error) {
                                                          switch (error.code) {
                                                            case error.MEDIA_ERR_ABORTED:
                                                              errorMessage = 'The user aborted the image load';
                                                              errorCode = 'MEDIA_ERR_ABORTED';
                                                              break;
                                                            case error.MEDIA_ERR_NETWORK:
                                                              errorMessage = 'A network error occurred while fetching the image';
                                                              errorCode = 'MEDIA_ERR_NETWORK';
                                                              break;
                                                            case error.MEDIA_ERR_DECODE:
                                                              errorMessage = 'An error occurred while decoding the image';
                                                              errorCode = 'MEDIA_ERR_DECODE';
                                                              break;
                                                            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                                              errorMessage = 'The image format is not supported';
                                                              errorCode = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                                                              break;
                                                            default:
                                                              errorMessage = `Unknown error (code: ${error.code})`;
                                                              errorCode = error.code;
                                                          }
                                                        }

                                                        console.error('❌ Image failed to load:', {
                                                          url: img.url,
                                                          key: img.key,
                                                          errorMessage,
                                                          errorCode,
                                                          imgElement: {
                                                            src: imgElement.src,
                                                            naturalWidth: imgElement.naturalWidth,
                                                            naturalHeight: imgElement.naturalHeight,
                                                            complete: imgElement.complete
                                                          },
                                                          fullImgObject: img
                                                        });
                                                      }}
                                                      onLoad={() => {
                                                        console.log('✅ Image loaded successfully:', img.url);
                                                      }}
                                                    />
                                                    {/* عرض الوصف إذا كان موجوداً */}
                                                    {(() => {
                                                      console.log(`📝 Checking description for image ${imgIndex}:`, {
                                                        hasDescription: !!img.description,
                                                        description: img.description,
                                                        img: img
                                                      });
                                                      return img.description ? (
                                                        <p className="mt-2 text-xs text-slate-600 text-center max-w-[120px] px-2">
                                                          {img.description}
                                                        </p>
                                                      ) : null;
                                                    })()}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center">
                                              <img
                                                src={imagesToShow[0].url}
                                                alt="Question"
                                                className="max-w-md w-full rounded-lg"
                                                onError={(e) => {
                                                  console.error('❌ Image failed to load:', {
                                                    url: imagesToShow[0].url,
                                                    img: imagesToShow[0],
                                                    error: e
                                                  });
                                                }}
                                                onLoad={() => {
                                                  console.log('✅ Image loaded successfully:', imagesToShow[0].url);
                                                }}
                                              />
                                              {/* عرض الوصف إذا كان موجوداً */}
                                              {(() => {
                                                console.log(`📝 Checking description for single image:`, {
                                                  hasDescription: !!imagesToShow[0].description,
                                                  description: imagesToShow[0].description,
                                                  img: imagesToShow[0]
                                                });
                                                return imagesToShow[0].description ? (
                                                  <p className="mt-3 text-sm text-slate-600 text-center max-w-md px-4">
                                                    {imagesToShow[0].description}
                                                  </p>
                                                ) : null;
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* MCQ — عرض الخيارات الحقيقية فقط (بدون "-"/"—") */}
                                  {qType === 'mcq' && (() => {
                                    const { displayOptions, originalIndices } = getDisplayOptions(item);
                                    if (!displayOptions.length) return null;
                                    return (
                                      <div className="space-y-2">
                                        {displayOptions.map((option, optIdx) => {
                                          const optionText = typeof option === 'string' ? option : (option?.text ?? option ?? '');
                                          const originalIdx = originalIndices[optIdx];
                                          const currentAnswer = answers[itemIndex];
                                          const selectedIndex = currentAnswer?.selectedIndex;
                                          const isSelected = selectedIndex === originalIdx;

                                          return (
                                            <button
                                              key={optIdx}
                                              onClick={() => {
                                                handleAnswerChange(itemIndex, originalIdx, 'mcq');
                                                saveAnswer(itemIndex, item.questionId, originalIdx, itemOverride);
                                              }}
                                              disabled={isSubmitted}
                                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-base transition ${isSelected
                                                ? 'bg-red-50 border-red-500'
                                                : 'bg-slate-50 border-slate-200 hover:border-red-500'
                                                }`}
                                              dir="ltr"
                                            >
                                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-red-600' : 'border-slate-300'
                                                }`}>
                                                {isSelected && (
                                                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                                )}
                                              </div>
                                              <span className="text-left flex-1">{optionText}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}

                                  {/* True/False */}
                                  {qType === 'true_false' && (
                                    <div className="space-y-2">
                                      <button
                                        onClick={() => {
                                          handleAnswerChange(itemIndex, true, 'true_false');
                                          saveAnswer(itemIndex, item.questionId, true, itemOverride);
                                        }}
                                        disabled={isSubmitted}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-base transition ${answers[itemIndex]?.studentAnswerBoolean === true
                                          ? 'bg-red-50 border-red-500'
                                          : 'bg-slate-50 border-slate-200 hover:border-red-500'
                                          }`}
                                        dir="ltr"
                                      >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[itemIndex]?.studentAnswerBoolean === true
                                          ? 'border-red-600'
                                          : 'border-slate-300'
                                          }`}>
                                          {answers[itemIndex]?.studentAnswerBoolean === true && (
                                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                          )}
                                        </div>
                                        <span>صحيح</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleAnswerChange(itemIndex, false, 'true_false');
                                          saveAnswer(itemIndex, item.questionId, false, itemOverride);
                                        }}
                                        disabled={isSubmitted}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-base transition ${answers[itemIndex]?.studentAnswerBoolean === false
                                          ? 'bg-red-50 border-red-500'
                                          : 'bg-slate-50 border-slate-200 hover:border-red-500'
                                          }`}
                                        dir="ltr"
                                      >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[itemIndex]?.studentAnswerBoolean === false
                                          ? 'border-red-600'
                                          : 'border-slate-300'
                                          }`}>
                                          {answers[itemIndex]?.studentAnswerBoolean === false && (
                                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                          )}
                                        </div>
                                        <span>خطأ</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Match */}
                                  {qType === 'match' && (() => {
                                    // ✅ قراءة answerKeyMatch من جميع الأماكن المحتملة
                                    // فحص شامل لجميع الأماكن المحتملة (بما في ذلك promptSnapshot)
                                    // ✅ قراءة answerKeyMatch من جميع الأماكن المحتملة
                                    // ترتيب الأولوية: item مباشرة → questionSnapshot → promptSnapshot → question → أماكن أخرى
                                    const pairs =
                                      item.answerKeyMatch ??
                                      item.questionSnapshot?.answerKeyMatch ??
                                      item.promptSnapshot?.answerKeyMatch ??
                                      item.question?.answerKeyMatch ??
                                      item.questionSnapshot?.answerKey ??
                                      item.answerKey ??
                                      item.pairs ??
                                      item.matchPairs ??
                                      [];

                                    // ✅ Debug شامل: طباعة كامل item object
                                    console.log('🔍 Match question FULL DEBUG:', {
                                      'item keys': Object.keys(item),
                                      'item.answerKeyMatch': item.answerKeyMatch,
                                      'item.questionSnapshot': item.questionSnapshot,
                                      'item.questionSnapshot keys': item.questionSnapshot ? Object.keys(item.questionSnapshot) : null,
                                      'item.questionSnapshot.answerKeyMatch': item.questionSnapshot?.answerKeyMatch,
                                      'item.promptSnapshot': item.promptSnapshot,
                                      'item.promptSnapshot keys': item.promptSnapshot ? Object.keys(item.promptSnapshot) : null,
                                      'item.promptSnapshot.answerKeyMatch': item.promptSnapshot?.answerKeyMatch,
                                      'item.question': item.question,
                                      'item.question keys': item.question ? Object.keys(item.question) : null,
                                      'item.question.answerKeyMatch': item.question?.answerKeyMatch,
                                      'item.answerKey': item.answerKey,
                                      'item.pairs': item.pairs,
                                      'item.matchPairs': item.matchPairs,
                                      'FOUND pairs': pairs,
                                      'pairs type': Array.isArray(pairs) ? 'array' : typeof pairs,
                                      'pairs length': Array.isArray(pairs) ? pairs.length : 'N/A',
                                      'FULL item object': JSON.stringify(item, null, 2)
                                    });

                                    // ✅ تحويل tuples إلى قائمتين
                                    let leftItems = [];
                                    let rightItems = [];

                                    console.log('🔍 Processing pairs:', {
                                      'pairs': pairs,
                                      'pairs is array': Array.isArray(pairs),
                                      'pairs length': Array.isArray(pairs) ? pairs.length : 'N/A',
                                      'first pair': Array.isArray(pairs) && pairs.length > 0 ? pairs[0] : 'N/A',
                                      'first pair type': Array.isArray(pairs) && pairs.length > 0 ? typeof pairs[0] : 'N/A',
                                      'first pair is array': Array.isArray(pairs) && pairs.length > 0 ? Array.isArray(pairs[0]) : 'N/A'
                                    });

                                    if (Array.isArray(pairs) && pairs.length > 0) {
                                      // التحقق من الشكل: tuples [[left, right], ...] أو objects [{left, right}, ...]
                                      if (Array.isArray(pairs[0])) {
                                        // tuples: [[left, right], ...]
                                        leftItems = pairs.map(([l]) => String(l || '').trim()).filter(Boolean);
                                        rightItems = pairs.map(([, r]) => String(r || '').trim()).filter(Boolean);
                                      } else if (typeof pairs[0] === 'object' && pairs[0] !== null) {
                                        // objects: [{left, right}, ...]
                                        leftItems = pairs.map(pair => String(pair.left || pair[0] || '').trim()).filter(Boolean);
                                        rightItems = pairs.map(pair => String(pair.right || pair[1] || '').trim()).filter(Boolean);
                                      }
                                    }

                                    // ✅ للطالب: استخدم optionsText أو optionsSnapshot إذا وُجدت (كل الخيارات + ترتيب عشوائي من الباك)
                                    const matchOptionsFromApi = Array.isArray(item.optionsText) && item.optionsText.length > 0
                                      ? item.optionsText.map((o) => (typeof o === 'string' ? o : (o?.text ?? o ?? '')))
                                      : (Array.isArray(item.optionsSnapshot) && item.optionsSnapshot.length > 0)
                                        ? item.optionsSnapshot.map((o) => (o && o.text) || '')
                                        : [];
                                    const rightItemsForDropdown = matchOptionsFromApi.length > 0 ? matchOptionsFromApi : rightItems;

                                    console.log('📊 Match items:', {
                                      leftItems,
                                      rightItemsFromPairs: rightItems,
                                      rightItemsForDropdown,
                                      'from optionsText': matchOptionsFromApi.length > 0
                                    });

                                    // ✅ تحذير إذا لم يكن هناك يسار أو خيارات للقائمة
                                    if (leftItems.length === 0 || rightItemsForDropdown.length === 0) {
                                      console.warn('⚠️ Match question has no pairs or options!', {
                                        pairs,
                                        leftItems,
                                        rightItemsForDropdown,
                                        'pairs type': typeof pairs,
                                        'pairs is array': Array.isArray(pairs),
                                        'pairs length': Array.isArray(pairs) ? pairs.length : 'N/A',
                                        item
                                      });
                                      return (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <p className="text-sm text-yellow-800">
                                            ⚠️ لا توجد أزواج مطابقة متاحة. يرجى التحقق من البيانات.
                                          </p>
                                        </div>
                                      );
                                    }

                                    // ✅ قراءة الإجابة الحالية
                                    const currentAnswer = answers[itemIndex]?.studentAnswerMatch || {};

                                    return (
                                      <div className="space-y-4">
                                        {/* Dropdowns للربط */}
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-semibold text-slate-700 mb-2">ربط المطابقة:</h4>
                                          {leftItems.map((leftItem, leftIdx) => {
                                            const selectedRight = currentAnswer[leftIdx] || '';

                                            return (
                                              <div key={leftIdx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                                <span className="flex-1 text-sm font-medium">{leftItem}</span>
                                                <span className="text-slate-400">→</span>
                                                <select
                                                  value={selectedRight}
                                                  disabled={isSubmitted}
                                                  onChange={(e) => {
                                                    const newAnswer = { ...currentAnswer, [leftIdx]: e.target.value };
                                                    handleAnswerChange(itemIndex, newAnswer, 'match');
                                                    clearTimeout(window.saveTimeout);
                                                    window.saveTimeout = setTimeout(() => {
                                                      saveAnswer(itemIndex, item.questionId, newAnswer, itemOverride);
                                                    }, 500);
                                                  }}
                                                  className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
                                                >
                                                  <option value="">اختر...</option>
                                                  {rightItemsForDropdown.map((rightItem, rightIdx) => (
                                                    <option key={rightIdx} value={rightItem}>
                                                      {rightItem}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* ✅ Fill - تم نقل input inline داخل نص السؤال أعلاه */}
                                  {/* لا حاجة لـ textarea منفصل بعد الآن */}

                                  {/* Free Text */}
                                  {qType === 'free_text' && (
                                    <div>
                                      <textarea
                                        value={answers[itemIndex]?.textAnswer || ''}
                                        disabled={isSubmitted}
                                        onChange={(e) => {
                                          handleAnswerChange(itemIndex, e.target.value, 'free_text');
                                          clearTimeout(window.saveTimeout);
                                          window.saveTimeout = setTimeout(() => {
                                            saveAnswer(itemIndex, item.questionId, e.target.value, itemOverride);
                                          }, 1000);
                                        }}
                                        placeholder="اكتب إجابتك النصية هنا..."
                                        className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm resize-vertical min-h-[150px] focus:outline-none focus:border-red-500"
                                        rows={8}
                                      />
                                      {item.minWords && (
                                        <p className="text-xs text-slate-500 mt-2">
                                          الحد الأدنى: {item.minWords} كلمة
                                        </p>
                                      )}
                                      {item.maxWords && (
                                        <p className="text-xs text-slate-500">
                                          الحد الأقصى: {item.maxWords} كلمة
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Speaking */}
                                  {qType === 'speaking' && (
                                    <SpeakingAnswerComponent
                                      itemIndex={itemIndex}
                                      item={item}
                                      answer={answers[itemIndex]?.audioAnswerUrl}
                                      isSubmitted={isSubmitted}
                                      onAnswerChange={(audioUrl) => {
                                        handleAnswerChange(itemIndex, audioUrl, 'speaking');
                                        saveAnswer(itemIndex, item.questionId, audioUrl, itemOverride);
                                      }}
                                      minDuration={item.minDuration}
                                      maxDuration={item.maxDuration}
                                    />
                                  )}

                                  {/* ✅ زر "تحقق" + نتيجة الفحص — يظهر فقط داخل الأقسام وقبل التسليم */}
                                  {!isSubmitted && selectedSectionKey && qType !== 'free_text' && qType !== 'speaking' && (
                                    <div className="mt-3">
                                      {/* زر تحقق */}
                                      {!checkedQuestions[itemIndex]?.isCorrect && !checkedQuestions[itemIndex]?.error && (
                                        <button
                                          onClick={() => handleCheckAnswer(itemIndex, item.questionId, itemOverride)}
                                          disabled={!answers[itemIndex] || checkedQuestions[itemIndex]?.checking}
                                          className="px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
                                        >
                                          {checkedQuestions[itemIndex]?.checking ? 'جاري الفحص...' : 'تحقق'}
                                        </button>
                                      )}

                                      {/* نتيجة الفحص */}
                                      {checkedQuestions[itemIndex] && !checkedQuestions[itemIndex].checking && !checkedQuestions[itemIndex].error && (
                                        <div className={`mt-2 p-3 rounded-lg border text-sm ${checkedQuestions[itemIndex].isCorrect
                                          ? 'bg-green-50 border-green-300 text-green-800'
                                          : 'bg-red-50 border-red-300 text-red-800'
                                          }`}>
                                          <div className="font-semibold mb-1">
                                            {checkedQuestions[itemIndex].isCorrect ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة'}
                                            <span className="text-xs font-normal mr-2">
                                              ({checkedQuestions[itemIndex].score}/{checkedQuestions[itemIndex].maxPoints} نقطة)
                                            </span>
                                          </div>

                                          {/* عرض الإجابة الصحيحة عند الخطأ */}
                                          {!checkedQuestions[itemIndex].isCorrect && checkedQuestions[itemIndex].correctAnswer && (() => {
                                            const ca = checkedQuestions[itemIndex].correctAnswer;
                                            const cqType = checkedQuestions[itemIndex].qType || qType;
                                            let correctText = '';

                                            if ((cqType === 'mcq' || cqType === 'listen') && ca.correctOptionIndexes) {
                                              const opts = safeOptionsArray(item);
                                              correctText = ca.correctOptionIndexes.map(i => opts[i] || `خيار ${i + 1}`).join('، ');
                                            } else if (cqType === 'true_false' && ca.correctOptionIndexes) {
                                              correctText = ca.correctOptionIndexes[0] === 0 ? 'صحيح' : 'خطأ';
                                            } else if (cqType === 'fill' && ca.fillExact) {
                                              correctText = Array.isArray(ca.fillExact) ? ca.fillExact.join(' / ') : ca.fillExact;
                                            } else if (cqType === 'match' && ca.answerKeyMatch) {
                                              const fmt = (p) => Array.isArray(p) ? `${p[0]} → ${p[1]}` : `${p.left || p[0]} → ${p.right || p[1]}`;
                                              correctText = ca.answerKeyMatch.map(fmt).join('، ');
                                            } else if (cqType === 'reorder' && ca.answerKeyReorder) {
                                              correctText = ca.answerKeyReorder.join(' → ');
                                            } else if (cqType === 'interactive_text' && (ca.interactiveBlanks || ca.interactiveReorder)) {
                                              if (ca.interactiveBlanks) {
                                                correctText = ca.interactiveBlanks.map(b => `${b.id || ''}: ${b.answer || b.text || ''}`).join('، ');
                                              }
                                            }

                                            return correctText ? (
                                              <div className="text-xs mt-1">
                                                <span className="font-medium">الإجابة الصحيحة: </span>{correctText}
                                              </div>
                                            ) : null;
                                          })()}
                                        </div>
                                      )}

                                      {/* خطأ بالفحص */}
                                      {checkedQuestions[itemIndex]?.error && (
                                        <div className="mt-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                                          حدث خطأ أثناء الفحص. حاول مرة أخرى.
                                          <button
                                            onClick={() => setCheckedQuestions(prev => { const n = { ...prev }; delete n[itemIndex]; return n; })}
                                            className="mr-2 underline"
                                          >
                                            إعادة المحاولة
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>}
                            </div>
                          );
                        });

                        // بلوكات محتوى متبقية بعد كل الأسئلة (trailing)
                        if (blockDist && blockDist.trailing && blockDist.trailing.length > 0) {
                          items.push(
                            <ContentBlocksRenderer key="trailing-blocks" blocks={blockDist.trailing} />
                          );
                        }

                        return items;
                      })()}
                    </div>

                    {/* ✅ نتيجة القسم الحالي */}
                    {selectedSectionKey && sectionSummaries[selectedSectionKey]?.data && (
                      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                        <h3 className="text-base font-bold text-slate-800">
                          نتيجة القسم
                        </h3>
                        {(() => {
                          const s = sectionSummaries[selectedSectionKey].data;
                          const pct = s.percent ?? Math.round((s.score / (s.maxScore || 1)) * 100);
                          return (
                            <>
                              {/* شريط النسبة */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{pct}%</span>
                              </div>

                              {/* إحصائيات */}
                              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                <div className="bg-green-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-green-700">{s.correct}</div>
                                  <div className="text-green-600">صحيحة</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-red-700">{s.wrong}</div>
                                  <div className="text-red-600">خاطئة</div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-slate-700">{s.unanswered}</div>
                                  <div className="text-slate-600">بدون إجابة</div>
                                </div>
                              </div>

                              <div className="text-xs text-slate-500 text-center">
                                النقاط: {s.score} / {s.maxScore}
                              </div>

                              {/* تفاصيل كل سؤال */}
                              {s.questions && s.questions.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  <p className="text-xs font-semibold text-slate-600">تفاصيل الأسئلة:</p>
                                  {s.questions.map((q, qi) => (
                                    <div key={q.questionId || qi} className={`flex items-center justify-between text-xs p-2 rounded-lg border ${!q.hasAnswer ? 'bg-slate-50 border-slate-200' : q.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                      }`}>
                                      <span className="font-medium">سؤال {qi + 1}</span>
                                      <span>
                                        {!q.hasAnswer ? '— لم تتم الإجابة' : q.isCorrect ? '✓ صحيح' : '✗ خطأ'}
                                        <span className="text-slate-400 mr-1">({q.score}/{q.maxPoints})</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* زر تسليم الامتحان — يظهر فقط في وضع "كل الأسئلة" */}
                    {(!hasSections || selectedSectionKey === null) && !isEducational && totalQuestions > 0 && (
                      <div className="mt-8 mb-4 text-center">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                          <p className="text-sm text-slate-600 mb-4">
                            أجبت على {answeredCount} من أصل {totalQuestions} سؤال
                          </p>
                          <button
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                          >
                            تسليم الامتحان
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>{/* End Main Content */}
        </div>{/* End flex container */}
      </div>
    </div>
  );
}

export default ExamPage;


