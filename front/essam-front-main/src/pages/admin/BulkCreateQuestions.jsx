import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';
import axios from 'axios';

const RichTextEditor = lazy(() => import('../../components/RichTextEditor'));
const SimpleHtmlEditor = lazy(() => import('../../components/SimpleHtmlEditor'));

const API_BASE_URL = 'https://api.deutsch-tests.com';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد (MCQ)' },
  { value: 'true_false', label: 'صح / خطأ' },
  { value: 'fill', label: 'أكمل الفراغ (Fill)' },
  { value: 'match', label: 'توصيل (Match)' },
  { value: 'reorder', label: 'ترتيب (Reorder)' },
];

const emptyQuestion = () => ({
  id: Date.now() + Math.random(),
  prompt: '',
  qType: 'mcq',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  answerKeyBoolean: true,
  fillExact: '',
  answerKeyMatch: [{ left: '', right: '' }],
  answerKeyReorder: [],
  reorderInput: '',
  points: 1,
});

function BulkCreateQuestions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill from URL params
  const preExamId = searchParams.get('examId') || '';
  const preSectionKey = searchParams.get('sectionKey') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam & section
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(preExamId);
  const [sections, setSections] = useState([]);
  const [sectionKey, setSectionKey] = useState(preSectionKey);

  // Exercise mode: 'audio' (Hören), 'reading' (Lesen), 'writing' (Schreiben), 'speaking' (Sprechen)
  const [exerciseMode, setExerciseMode] = useState('audio');
  const useAudio = exerciseMode === 'audio'; // backward compat

  // Audio clip (optional - for audio & speaking modes)
  const [listeningClipId, setListeningClipId] = useState(null);
  const [clipAudioUrl, setClipAudioUrl] = useState(null);
  const [sectionClips, setSectionClips] = useState([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Reading passage (optional - for Lesen)
  const [readingPassage, setReadingPassage] = useState('');
  const [readingPassageBgColor, setReadingPassageBgColor] = useState('');
  const [readingCards, setReadingCards] = useState([]);
  const [cardsLayout, setCardsLayout] = useState('horizontal'); // 'horizontal' | 'vertical'

  // Content blocks (for speaking mode)
  const [contentBlocks, setContentBlocks] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Writing mode state
  const [writingPassage, setWritingPassage] = useState('');
  const [writingPassageBgColor, setWritingPassageBgColor] = useState('');
  const [writingCards, setWritingCards] = useState([]);
  const [writingCardsLayout, setWritingCardsLayout] = useState('horizontal');
  const [interactiveTextType, setInteractiveTextType] = useState('fill_blanks');
  const [interactiveTextContent, setInteractiveTextContent] = useState('');
  const [interactiveTextBgColor, setInteractiveTextBgColor] = useState('');
  const [interactiveBlanks, setInteractiveBlanks] = useState([]);
  const [interactiveReorderParts, setInteractiveReorderParts] = useState([]);
  const interactiveEditorRef = useRef(null);

  // Questions
  const [questions, setQuestions] = useState([emptyQuestion()]);

  // Results
  const [results, setResults] = useState(null);

  // Fetch exams
  useEffect(() => {
    examsAPI.getAll().then(data => {
      setExams(Array.isArray(data) ? data : data?.exams || data?.items || []);
    }).catch(() => {});
  }, []);

  // Fetch sections when exam changes
  useEffect(() => {
    if (!examId) { setSections([]); setSectionKey(''); return; }
    examsAPI.getSections(examId).then(data => {
      setSections(Array.isArray(data) ? data : data?.sections || []);
    }).catch(() => setSections([]));
  }, [examId]);

  // Fetch clips when section changes
  useEffect(() => {
    if (!examId || !sectionKey) { setSectionClips([]); return; }
    setLoadingClips(true);
    examsAPI.getSectionClips(examId, sectionKey)
      .then(data => {
        const clips = Array.isArray(data) ? data : data?.clips || data?.items || [];
        setSectionClips(clips);
      })
      .catch(() => setSectionClips([]))
      .finally(() => setLoadingClips(false));
  }, [examId, sectionKey]);

  // Select existing clip
  const handleSelectClip = (clip) => {
    const id = clip.listeningClipId || clip._id || clip.id;
    setListeningClipId(id);
    setClipAudioUrl(clip.audioUrl);
    setAudioFile(null);
    setAudioPreview(null);
  };

  // Upload new audio
  const handleUploadAudio = async () => {
    if (!audioFile) return;
    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const fd = new FormData();
      fd.append('file', audioFile);
      if (examId) fd.append('examId', examId);
      if (sectionKey) fd.append('sectionKey', sectionKey);

      const res = await axios.post(`${API_BASE_URL}/listeningclips/upload-audio`, fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const clipId = res.data.listeningClipId || res.data._id || res.data.id;
      setListeningClipId(clipId);
      setClipAudioUrl(res.data.audioUrl);
      setSuccess('تم رفع الملف الصوتي بنجاح');
    } catch (err) {
      setError('فشل رفع الملف الصوتي: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveClip = () => {
    setListeningClipId(null);
    setClipAudioUrl(null);
    setAudioFile(null);
    setAudioPreview(null);
  };

  // --- Question management ---
  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);

  const removeQuestion = (id) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId, optIdx, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      if (field === 'isCorrect') {
        // only one correct for MCQ
        opts.forEach((o, i) => { o.isCorrect = i === optIdx; });
      } else {
        opts[optIdx] = { ...opts[optIdx], [field]: value };
      }
      return { ...q, options: opts };
    }));
  };

  const addOption = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return { ...q, options: [...q.options, { text: '', isCorrect: false }] };
    }));
  };

  const removeOption = (qId, optIdx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
    }));
  };

  const addMatchPair = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return { ...q, answerKeyMatch: [...q.answerKeyMatch, { left: '', right: '' }] };
    }));
  };

  const updateMatchPair = (qId, pairIdx, side, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const pairs = [...q.answerKeyMatch];
      pairs[pairIdx] = { ...pairs[pairIdx], [side]: value };
      return { ...q, answerKeyMatch: pairs };
    }));
  };

  const removeMatchPair = (qId, pairIdx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.answerKeyMatch.length <= 1) return q;
      return { ...q, answerKeyMatch: q.answerKeyMatch.filter((_, i) => i !== pairIdx) };
    }));
  };

  // --- Build payload per question ---
  const buildQuestionPayload = (q) => {
    const data = {
      prompt: q.prompt.trim(),
      qType: q.qType,
      points: q.points || 1,
    };

    if (q.qType === 'mcq') {
      data.options = q.options.filter(o => o.text.trim()).map(o => ({
        text: o.text.trim(),
        isCorrect: o.isCorrect,
      }));
    } else if (q.qType === 'true_false') {
      data.answerKeyBoolean = q.answerKeyBoolean;
    } else if (q.qType === 'fill') {
      data.fillExact = q.fillExact.trim();
    } else if (q.qType === 'match') {
      data.answerKeyMatch = q.answerKeyMatch
        .filter(p => p.left.trim() && p.right.trim())
        .map(p => [p.left.trim(), p.right.trim()]);
    } else if (q.qType === 'reorder') {
      data.answerKeyReorder = q.reorderInput
        ? q.reorderInput.split(',').map(s => s.trim()).filter(Boolean)
        : q.answerKeyReorder;
    }

    return data;
  };

  // --- Reading Cards ---
  const addReadingCard = () => {
    setReadingCards(prev => [...prev, { title: '', content: '' }]);
  };
  const updateReadingCard = (index, field, value) => {
    setReadingCards(prev => prev.map((card, i) => i === index ? { ...card, [field]: value } : card));
  };
  const removeReadingCard = (index) => {
    setReadingCards(prev => prev.filter((_, i) => i !== index));
  };

  // --- Writing Cards ---
  const addWritingCard = () => {
    setWritingCards(prev => [...prev, { title: '', content: '', color: '' }]);
  };
  const updateWritingCard = (index, field, value) => {
    setWritingCards(prev => prev.map((card, i) => i === index ? { ...card, [field]: value } : card));
  };
  const removeWritingCard = (index) => {
    setWritingCards(prev => prev.filter((_, i) => i !== index));
  };

  // --- Interactive Blanks ---
  const addInteractiveBlank = () => {
    const id = String.fromCharCode(97 + interactiveBlanks.length); // a, b, c...
    setInteractiveBlanks(prev => [...prev, { id, type: 'text', correctAnswers: [''], choices: [], hint: '' }]);
  };
  const updateInteractiveBlank = (index, field, value) => {
    setInteractiveBlanks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };
  const removeInteractiveBlank = (index) => {
    setInteractiveBlanks(prev => prev.filter((_, i) => i !== index));
  };
  const addBlankCorrectAnswer = (blankIndex) => {
    setInteractiveBlanks(prev => prev.map((b, i) => i === blankIndex ? { ...b, correctAnswers: [...b.correctAnswers, ''] } : b));
  };
  const updateBlankCorrectAnswer = (blankIndex, ansIndex, value) => {
    setInteractiveBlanks(prev => prev.map((b, i) => {
      if (i !== blankIndex) return b;
      const ca = [...b.correctAnswers];
      ca[ansIndex] = value;
      return { ...b, correctAnswers: ca };
    }));
  };
  const removeBlankCorrectAnswer = (blankIndex, ansIndex) => {
    setInteractiveBlanks(prev => prev.map((b, i) => {
      if (i !== blankIndex || b.correctAnswers.length <= 1) return b;
      return { ...b, correctAnswers: b.correctAnswers.filter((_, j) => j !== ansIndex) };
    }));
  };
  const addBlankChoice = (blankIndex) => {
    setInteractiveBlanks(prev => prev.map((b, i) => i === blankIndex ? { ...b, choices: [...b.choices, ''] } : b));
  };
  const updateBlankChoice = (blankIndex, choiceIndex, value) => {
    setInteractiveBlanks(prev => prev.map((b, i) => {
      if (i !== blankIndex) return b;
      const ch = [...b.choices];
      ch[choiceIndex] = value;
      return { ...b, choices: ch };
    }));
  };
  const removeBlankChoice = (blankIndex, choiceIndex) => {
    setInteractiveBlanks(prev => prev.map((b, i) => {
      if (i !== blankIndex) return b;
      return { ...b, choices: b.choices.filter((_, j) => j !== choiceIndex) };
    }));
  };

  // --- Reorder Parts ---
  const addReorderPart = () => {
    setInteractiveReorderParts(prev => [...prev, { text: '', order: prev.length + 1 }]);
  };
  const updateReorderPart = (index, field, value) => {
    setInteractiveReorderParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };
  const removeReorderPart = (index) => {
    setInteractiveReorderParts(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i + 1 })));
  };

  // --- Content Blocks (Speaking) ---
  const ADMIN_CARD_COLORS = [
    { key: 'teal', label: 'أخضر فاتح', bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
    { key: 'sky', label: 'أزرق فاتح', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
    { key: 'emerald', label: 'أخضر', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
    { key: 'violet', label: 'بنفسجي', bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
    { key: 'rose', label: 'وردي', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
    { key: 'amber', label: 'ذهبي', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
    { key: 'orange', label: 'برتقالي', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
    { key: 'indigo', label: 'نيلي', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
    { key: 'gray', label: 'رمادي', bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
  ];

  const addContentBlock = (type) => {
    const newBlock = {
      type,
      order: contentBlocks.length,
      ...(type === 'paragraph' && { text: '' }),
      ...(type === 'image' && { images: [] }),
      ...(type === 'cards' && { cards: [{ title: '', texts: [{ label: '', content: '' }], color: '' }], cardsLayout: 'horizontal' }),
      ...(type === 'questions' && { questionCount: 1 }),
      ...(type === 'audio' && { audioUrl: null, audioFile: null, audioPreview: null }),
    };
    setContentBlocks(prev => [...prev, newBlock]);
  };

  const removeContentBlock = (index) => {
    setContentBlocks(prev => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i })));
  };

  const moveContentBlock = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= contentBlocks.length) return;
    setContentBlocks(prev => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy.map((b, i) => ({ ...b, order: i }));
    });
  };

  const updateContentBlock = (index, updates) => {
    setContentBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const handleUploadBlockImages = async (blockIndex, files) => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setError('يرجى تسجيل الدخول أولاً'); return; }
    setUploadingImages(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API_BASE_URL}/media/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        uploaded.push({ key: res.data.key, url: res.data.url, mime: res.data.mime || file.type, description: '' });
      }
      if (uploaded.length > 0) {
        setContentBlocks(prev => prev.map((b, i) =>
          i === blockIndex ? { ...b, images: [...(b.images || []), ...uploaded] } : b
        ));
      }
    } catch (err) {
      setError('فشل رفع الصورة: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleUploadBlockAudio = async (blockIndex) => {
    const block = contentBlocks[blockIndex];
    if (!block || !block.audioFile) return;
    setError('');
    updateContentBlock(blockIndex, { _uploading: true });
    try {
      const token = localStorage.getItem('accessToken');
      const fd = new FormData();
      fd.append('file', block.audioFile);
      if (examId) fd.append('examId', examId);
      if (sectionKey) fd.append('sectionKey', sectionKey);
      const res = await axios.post(`${API_BASE_URL}/listeningclips/upload-audio`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: token ? `Bearer ${token}` : '' },
      });
      if (block.audioPreview) URL.revokeObjectURL(block.audioPreview);
      updateContentBlock(blockIndex, { audioUrl: res.data.audioUrl, audioFile: null, audioPreview: null, _uploading: false });
      setSuccess('تم رفع الملف الصوتي بنجاح');
    } catch (err) {
      updateContentBlock(blockIndex, { _uploading: false });
      setError('فشل رفع الملف الصوتي: ' + (err.response?.data?.message || err.message));
    }
  };

  const removeBlockImage = (blockIndex, imgIndex) => {
    setContentBlocks(prev => prev.map((b, i) =>
      i === blockIndex ? { ...b, images: (b.images || []).filter((_, j) => j !== imgIndex) } : b
    ));
  };

  const addCardToBlock = (blockIndex) => {
    setContentBlocks(prev => prev.map((b, i) =>
      i === blockIndex ? { ...b, cards: [...(b.cards || []), { title: '', texts: [{ label: '', content: '' }], color: '' }] } : b
    ));
  };

  const removeCardFromBlock = (blockIndex, cardIndex) => {
    setContentBlocks(prev => prev.map((b, i) =>
      i === blockIndex ? { ...b, cards: (b.cards || []).filter((_, j) => j !== cardIndex) } : b
    ));
  };

  const updateCardInBlock = (blockIndex, cardIndex, field, value) => {
    setContentBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const cards = [...(b.cards || [])];
      cards[cardIndex] = { ...cards[cardIndex], [field]: value };
      return { ...b, cards };
    }));
  };

  const addTextToCard = (blockIndex, cardIndex) => {
    setContentBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const cards = [...(b.cards || [])];
      cards[cardIndex] = { ...cards[cardIndex], texts: [...(cards[cardIndex].texts || []), { label: '', content: '' }] };
      return { ...b, cards };
    }));
  };

  const removeTextFromCard = (blockIndex, cardIndex, textIndex) => {
    setContentBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const cards = [...(b.cards || [])];
      cards[cardIndex] = { ...cards[cardIndex], texts: (cards[cardIndex].texts || []).filter((_, j) => j !== textIndex) };
      return { ...b, cards };
    }));
  };

  const updateCardText = (blockIndex, cardIndex, textIndex, field, value) => {
    setContentBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const cards = [...(b.cards || [])];
      const texts = [...(cards[cardIndex].texts || [])];
      texts[textIndex] = { ...texts[textIndex], [field]: value };
      cards[cardIndex] = { ...cards[cardIndex], texts };
      return { ...b, cards };
    }));
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    setSuccess('');
    setResults(null);

    if (!examId) { setError('اختر الامتحان أولاً'); return; }
    if (!sectionKey) { setError('اختر القسم أولاً'); return; }
    if (exerciseMode === 'audio' && !listeningClipId) { setError('اختر أو ارفع ملف الاستماع أولاً'); return; }

    // الأسئلة الفعلية (تجاهل الأسئلة الفارغة تماماً)
    const actualQuestions = questions.filter(q => q.prompt.trim());
    const emptyPrompts = questions.filter(q => !q.prompt.trim());
    // إذا كان هناك أسئلة مكتوبة جزئياً (بعضها فارغ وبعضها لا) — تنبيه
    if (emptyPrompts.length > 0 && actualQuestions.length > 0) { setError('جميع الأسئلة يجب أن تحتوي على نص'); return; }

    setLoading(true);
    try {
      let payload = actualQuestions.map(buildQuestionPayload);
      const validCards = exerciseMode === 'reading' ? readingCards.filter(c => c.title.trim() && c.content.trim()) : [];
      const validWritingCards = exerciseMode === 'writing' ? writingCards.filter(c => (c.title || '').replace(/<[^>]+>/g, '').trim() && (c.content || '').replace(/<[^>]+>/g, '').trim()) : [];
      const sendClipId = exerciseMode === 'audio' ? listeningClipId : null;
      const validContentBlocks = exerciseMode === 'speaking' ? contentBlocks.filter(b => {
        if (b.type === 'paragraph') return b.text?.trim();
        if (b.type === 'image') return b.images?.length > 0;
        if (b.type === 'cards') return b.cards?.some(c => c.title?.trim() && c.texts?.some(t => t.content?.trim()));
        if (b.type === 'questions') return (b.questionCount || 0) > 0;
        if (b.type === 'audio') return !!b.audioUrl;
        return false;
      }).map(b => {
        if (b.type === 'audio') {
          const { audioFile, audioPreview, _uploading, ...rest } = b;
          return rest;
        }
        return b;
      }) : [];

      // Build interactive text question for writing mode
      if (exerciseMode === 'writing') {
        if (interactiveTextType === 'fill_blanks' && interactiveTextContent.replace(/<[^>]+>/g, '').trim() && interactiveBlanks.length > 0) {
          const plainText = interactiveTextContent.replace(/<[^>]+>/g, '');
          const interactiveQ = {
            prompt: 'نص تفاعلي',
            qType: 'interactive_text',
            points: 1,
            text: plainText,
            interactiveText: interactiveTextContent,
            interactiveBlanks: interactiveBlanks.map(b => ({
              id: b.id,
              type: b.type,
              answer: b.correctAnswers[0] || '',
              correctAnswers: b.correctAnswers.filter(a => a.trim()),
              options: b.type === 'dropdown' ? b.choices.filter(c => c.trim()) : [],
              choices: b.type === 'dropdown' ? b.choices.filter(c => c.trim()) : [],
              hint: b.hint || '',
            })),
            taskType: 'fill_blanks',
            interactiveTextBgColor: interactiveTextBgColor || null,
          };
          payload.push(interactiveQ);
        } else if (interactiveTextType === 'reorder' && interactiveReorderParts.length > 0) {
          const validParts = interactiveReorderParts.filter(p => (p.text || '').replace(/<[^>]+>/g, '').trim());
          if (validParts.length > 0) {
            const interactiveQ = {
              prompt: 'ترتيب الأجزاء',
              qType: 'interactive_text',
              points: 1,
              taskType: 'reorder',
              interactiveReorder: {
                parts: validParts.map((p, i) => ({
                  text: p.text,
                  order: p.order || i + 1,
                })),
              },
              interactiveTextBgColor: interactiveTextBgColor || null,
            };
            payload.push(interactiveQ);
          }
        }
      }

      // التحقق من وجود محتوى أو أسئلة
      const hasWritingContent = exerciseMode === 'writing' && (writingPassage.replace(/<[^>]+>/g, '').trim() || validWritingCards.length > 0 || interactiveTextContent.replace(/<[^>]+>/g, '').trim() || interactiveReorderParts.length > 0);
      if (payload.length === 0 && validContentBlocks.length === 0 && !sendClipId && !readingPassage.trim() && validCards.length === 0 && !hasWritingContent) {
        setError('أضف أسئلة أو محتوى (فقرات/صور/صوت) على الأقل'); setLoading(false); return;
      }

      // For writing mode: map writing state to existing backend fields (readingPassage, readingCards)
      const sendPassage = exerciseMode === 'reading' ? (readingPassage.trim() || null) :
                          exerciseMode === 'writing' ? (writingPassage.replace(/<[^>]+>/g, '').trim() ? writingPassage : null) : null;
      const sendCards = exerciseMode === 'reading' && validCards.length > 0 ? validCards :
                        exerciseMode === 'writing' && validWritingCards.length > 0 ? validWritingCards : null;
      const sendCardsLayout = sendCards ? (exerciseMode === 'writing' ? writingCardsLayout : cardsLayout) : null;
      const sendBgColor = exerciseMode === 'reading' ? (readingPassageBgColor?.trim() || null) :
                          exerciseMode === 'writing' ? (writingPassageBgColor?.trim() || null) : null;

      const result = await examsAPI.bulkCreateQuestions(
        examId, sectionKey, sendClipId, payload,
        sendPassage,
        sendCards,
        sendCardsLayout,
        validContentBlocks.length > 0 ? validContentBlocks : null,
        sendBgColor
      );
      setResults(result);
      const msg = payload.length > 0
        ? `تم إنشاء ${result.success} سؤال بنجاح${result.failed > 0 ? ` (${result.failed} فشل)` : ''}`
        : 'تم حفظ المحتوى التعليمي بنجاح';
      setSuccess(msg);
    } catch (err) {
      setError('فشل إنشاء الأسئلة: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1e293b' }}>
          إضافة أسئلة متعددة
        </h1>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, background: 'white', cursor: 'pointer' }}
        >
          ← رجوع
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#16a34a', fontSize: 14 }}>
          {success}
        </div>
      )}

      {/* Step 1: Exam + Section */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#334155', marginBottom: 16 }}>
          1. اختر الامتحان والقسم
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#475569' }}>الامتحان *</label>
            <select
              value={examId}
              onChange={(e) => { setExamId(e.target.value); setSectionKey(''); setListeningClipId(null); }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
            >
              <option value="">-- اختر امتحان --</option>
              {exams.map(ex => (
                <option key={ex._id || ex.id} value={ex._id || ex.id}>
                  {ex.title || ex.name} {ex.level ? `(${ex.level})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#475569' }}>القسم (Section) *</label>
            <select
              value={sectionKey}
              onChange={(e) => { setSectionKey(e.target.value); setListeningClipId(null); }}
              disabled={!examId}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
            >
              <option value="">-- اختر قسم --</option>
              {sections.map(sec => (
                <option key={sec.key || sec.sectionKey} value={sec.key || sec.sectionKey}>
                  {sec.title || sec.name || sec.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Audio Clip (Optional) */}
      {examId && sectionKey && (
        <div style={{ background: 'white', border: `2px solid ${useAudio ? '#0ea5e9' : '#94a3b8'}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: useAudio ? '#0369a1' : '#64748b', margin: 0 }}>
              2. ملف الاستماع
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setExerciseMode('audio'); setReadingPassage(''); setReadingCards([]); setContentBlocks([]); setWritingPassage(''); setWritingCards([]); setInteractiveTextContent(''); setInteractiveBlanks([]); setInteractiveReorderParts([]); }}
                style={{
                  padding: '5px 14px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  border: exerciseMode === 'audio' ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
                  backgroundColor: exerciseMode === 'audio' ? '#dbeafe' : 'white',
                  color: exerciseMode === 'audio' ? '#0369a1' : '#64748b',
                }}
              >
                سماعي
              </button>
              <button
                type="button"
                onClick={() => { setExerciseMode('reading'); setListeningClipId(null); setClipAudioUrl(null); setAudioFile(null); setAudioPreview(null); setContentBlocks([]); setWritingPassage(''); setWritingCards([]); setInteractiveTextContent(''); setInteractiveBlanks([]); setInteractiveReorderParts([]); }}
                style={{
                  padding: '5px 14px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  border: exerciseMode === 'reading' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  backgroundColor: exerciseMode === 'reading' ? '#e0e7ff' : 'white',
                  color: exerciseMode === 'reading' ? '#4338ca' : '#64748b',
                }}
              >
                قراءة
              </button>
              <button
                type="button"
                onClick={() => { setExerciseMode('writing'); setListeningClipId(null); setClipAudioUrl(null); setAudioFile(null); setAudioPreview(null); setReadingPassage(''); setReadingCards([]); setContentBlocks([]); }}
                style={{
                  padding: '5px 14px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  border: exerciseMode === 'writing' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  backgroundColor: exerciseMode === 'writing' ? '#fffbeb' : 'white',
                  color: exerciseMode === 'writing' ? '#b45309' : '#64748b',
                }}
              >
                كتابة
              </button>
              <button
                type="button"
                onClick={() => { setExerciseMode('speaking'); setReadingPassage(''); setReadingCards([]); setWritingPassage(''); setWritingCards([]); setInteractiveTextContent(''); setInteractiveBlanks([]); setInteractiveReorderParts([]); }}
                style={{
                  padding: '5px 14px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  border: exerciseMode === 'speaking' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  backgroundColor: exerciseMode === 'speaking' ? '#dcfce7' : 'white',
                  color: exerciseMode === 'speaking' ? '#15803d' : '#64748b',
                }}
              >
                تحدث
              </button>
            </div>
          </div>

          {exerciseMode === 'reading' ? (
            <div style={{ padding: 16, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#92400e' }}>
                فقرة القراءة (اختياري)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#92400e' }}>لون الخلفية:</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
                    { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
                    { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
                    { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
                    { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
                    { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
                    { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
                  ].map((c) => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => setReadingPassageBgColor(c.value)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', border: `2px solid ${readingPassageBgColor === c.value ? '#3b82f6' : c.border}`,
                        backgroundColor: c.bg, cursor: 'pointer', boxShadow: readingPassageBgColor === c.value ? '0 0 0 2px #93c5fd' : 'none',
                      }} />
                  ))}
                  <input type="color" value={readingPassageBgColor || '#fefce8'}
                    onChange={(e) => setReadingPassageBgColor(e.target.value)}
                    title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
                </div>
              </div>
              <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                <SimpleHtmlEditor
                  value={readingPassage}
                  onChange={(html) => setReadingPassage(html || '')}
                  placeholder="انسخ نص القراءة هنا من الوورد... (المحاذاة وحجم الخط ستُحفظ)"
                  dir="ltr"
                />
              </Suspense>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#92400e' }}>
                {readingPassage.trim() || readingCards.length > 0
                  ? 'جميع الأسئلة أدناه ستظهر تحت هذه الفقرة/البطاقات كتمرين واحد'
                  : 'بدون فقرة — كل سؤال سيظهر كتمرين منفصل'}
              </p>

              {/* بطاقات المعلومات */}
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>
                    بطاقات المعلومات (اختياري)
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {readingCards.length > 0 && (
                      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #f59e0b' }}>
                        <button
                          type="button"
                          onClick={() => setCardsLayout('horizontal')}
                          title="بطاقة بعرض كامل - تحت بعض"
                          style={{
                            padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: cardsLayout === 'horizontal' ? '#f59e0b' : '#fef3c7',
                            color: cardsLayout === 'horizontal' ? '#fff' : '#92400e',
                          }}
                        >
                          ▤ أفقي
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardsLayout('vertical')}
                          title="بطاقات جنب بعض - أعمدة"
                          style={{
                            padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            borderRight: '1px solid #f59e0b',
                            backgroundColor: cardsLayout === 'vertical' ? '#f59e0b' : '#fef3c7',
                            color: cardsLayout === 'vertical' ? '#fff' : '#92400e',
                          }}
                        >
                          ▦ عمودي
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={addReadingCard}
                      style={{
                        padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                        border: '1px solid #f59e0b', backgroundColor: '#fbbf24', color: '#78350f',
                        cursor: 'pointer'
                      }}
                    >
                      + بطاقة جديدة
                    </button>
                  </div>
                </div>

                {readingCards.length === 0 && (
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>
                    لم تُضاف بطاقات بعد — اضغط "بطاقة جديدة" لإضافة بطاقات معلومات (مثل إعلانات، كورسات، أقسام)
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: cardsLayout === 'horizontal' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {readingCards.map((card, idx) => {
                    const ADMIN_CARD_COLORS = [
                      { key: 'teal', label: 'أخضر فاتح', bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
                      { key: 'sky', label: 'أزرق فاتح', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
                      { key: 'emerald', label: 'أخضر', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
                      { key: 'violet', label: 'بنفسجي', bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
                      { key: 'rose', label: 'وردي', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
                      { key: 'amber', label: 'ذهبي', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
                      { key: 'orange', label: 'برتقالي', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
                      { key: 'indigo', label: 'نيلي', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
                      { key: 'gray', label: 'رمادي', bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
                    ];
                    const selectedColor = ADMIN_CARD_COLORS.find(c => c.key === card.color) || ADMIN_CARD_COLORS[idx % ADMIN_CARD_COLORS.length];
                    return (
                      <div key={idx} style={{
                        padding: 12, backgroundColor: selectedColor.bg, border: `2px solid ${selectedColor.border}`,
                        borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: selectedColor.text }}>بطاقة {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeReadingCard(idx)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                          >
                            حذف
                          </button>
                        </div>
                        {/* اختيار اللون */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                          {ADMIN_CARD_COLORS.map(c => (
                            <button
                              key={c.key}
                              type="button"
                              title={c.label}
                              onClick={() => updateReadingCard(idx, 'color', c.key)}
                              style={{
                                width: 22, height: 22, borderRadius: '50%',
                                backgroundColor: c.bg, border: `2px solid ${card.color === c.key ? c.text : c.border}`,
                                cursor: 'pointer', boxShadow: card.color === c.key ? `0 0 0 2px ${c.border}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={card.title || ''}
                            onChange={(html) => updateReadingCard(idx, 'title', html)}
                            placeholder="عنوان البطاقة (مثل: 1. Etage - Technik & Freizeit)"
                            dir="ltr"
                          />
                        </Suspense>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={card.content || ''}
                            onChange={(html) => updateReadingCard(idx, 'content', html)}
                            placeholder="محتوى البطاقة..."
                            dir="ltr"
                          />
                        </Suspense>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : exerciseMode === 'writing' ? (
            <div style={{ padding: 16, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              {/* Section A: Writing Passage */}
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#b45309' }}>
                فقرة الكتابة (اختياري)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#b45309' }}>لون الخلفية:</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
                    { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
                    { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
                    { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
                    { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
                    { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
                    { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
                  ].map((c) => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => setWritingPassageBgColor(c.value)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', border: `2px solid ${writingPassageBgColor === c.value ? '#f59e0b' : c.border}`,
                        backgroundColor: c.bg, cursor: 'pointer', boxShadow: writingPassageBgColor === c.value ? '0 0 0 2px #fbbf24' : 'none',
                      }} />
                  ))}
                  <input type="color" value={writingPassageBgColor || '#fefce8'}
                    onChange={(e) => setWritingPassageBgColor(e.target.value)}
                    title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
                </div>
              </div>
              <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                <SimpleHtmlEditor
                  value={writingPassage}
                  onChange={(html) => setWritingPassage(html || '')}
                  placeholder="انسخ نص الكتابة هنا من الوورد... (المحاذاة وحجم الخط ستُحفظ)"
                  dir="ltr"
                />
              </Suspense>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b45309' }}>
                {writingPassage.trim() || writingCards.length > 0
                  ? 'جميع الأسئلة أدناه ستظهر تحت هذه الفقرة/البطاقات كتمرين واحد'
                  : 'بدون فقرة — كل سؤال سيظهر كتمرين منفصل'}
              </p>

              {/* Section B: Writing Cards */}
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: '#b45309' }}>
                    بطاقات المعلومات (اختياري)
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {writingCards.length > 0 && (
                      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #f59e0b' }}>
                        <button type="button" onClick={() => setWritingCardsLayout('horizontal')}
                          title="بطاقة بعرض كامل - تحت بعض"
                          style={{
                            padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: writingCardsLayout === 'horizontal' ? '#f59e0b' : '#fef3c7',
                            color: writingCardsLayout === 'horizontal' ? '#fff' : '#b45309',
                          }}>
                          ▤ أفقي
                        </button>
                        <button type="button" onClick={() => setWritingCardsLayout('vertical')}
                          title="بطاقات جنب بعض - أعمدة"
                          style={{
                            padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            borderRight: '1px solid #f59e0b',
                            backgroundColor: writingCardsLayout === 'vertical' ? '#f59e0b' : '#fef3c7',
                            color: writingCardsLayout === 'vertical' ? '#fff' : '#b45309',
                          }}>
                          ▦ عمودي
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={addWritingCard}
                      style={{
                        padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                        border: '1px solid #f59e0b', backgroundColor: '#fbbf24', color: '#78350f', cursor: 'pointer'
                      }}>
                      + بطاقة جديدة
                    </button>
                  </div>
                </div>

                {writingCards.length === 0 && (
                  <p style={{ fontSize: 11, color: '#b45309', margin: 0 }}>
                    لم تُضاف بطاقات بعد — اضغط "بطاقة جديدة" لإضافة بطاقات معلومات
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: writingCardsLayout === 'horizontal' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {writingCards.map((card, idx) => {
                    const WR_CARD_COLORS = [
                      { key: 'teal', label: 'أخضر فاتح', bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
                      { key: 'sky', label: 'أزرق فاتح', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
                      { key: 'emerald', label: 'أخضر', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
                      { key: 'violet', label: 'بنفسجي', bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
                      { key: 'rose', label: 'وردي', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
                      { key: 'amber', label: 'ذهبي', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
                      { key: 'orange', label: 'برتقالي', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
                      { key: 'indigo', label: 'نيلي', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
                      { key: 'gray', label: 'رمادي', bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
                    ];
                    const selectedColor = WR_CARD_COLORS.find(c => c.key === card.color) || WR_CARD_COLORS[idx % WR_CARD_COLORS.length];
                    return (
                      <div key={idx} style={{ padding: 12, backgroundColor: selectedColor.bg, border: `2px solid ${selectedColor.border}`, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: selectedColor.text }}>بطاقة {idx + 1}</span>
                          <button type="button" onClick={() => removeWritingCard(idx)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                            حذف
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                          {WR_CARD_COLORS.map(c => (
                            <button key={c.key} type="button" title={c.label}
                              onClick={() => updateWritingCard(idx, 'color', c.key)}
                              style={{
                                width: 22, height: 22, borderRadius: '50%',
                                backgroundColor: c.bg, border: `2px solid ${card.color === c.key ? c.text : c.border}`,
                                cursor: 'pointer', boxShadow: card.color === c.key ? `0 0 0 2px ${c.border}` : 'none',
                              }} />
                          ))}
                        </div>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={card.title || ''}
                            onChange={(html) => updateWritingCard(idx, 'title', html)}
                            placeholder="عنوان البطاقة"
                            dir="ltr"
                          />
                        </Suspense>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={card.content || ''}
                            onChange={(html) => updateWritingCard(idx, 'content', html)}
                            placeholder="محتوى البطاقة..."
                            dir="ltr"
                          />
                        </Suspense>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section C: Interactive Text */}
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: '#b45309' }}>
                    نص تفاعلي (اختياري)
                  </label>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #f59e0b' }}>
                    <button type="button"
                      onClick={() => setInteractiveTextType('fill_blanks')}
                      style={{
                        padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                        backgroundColor: interactiveTextType === 'fill_blanks' ? '#f59e0b' : '#fff7ed',
                        color: interactiveTextType === 'fill_blanks' ? '#fff' : '#b45309',
                      }}>
                      فراغات متعددة
                    </button>
                    <button type="button"
                      onClick={() => setInteractiveTextType('reorder')}
                      style={{
                        padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                        borderRight: '1px solid #f59e0b',
                        backgroundColor: interactiveTextType === 'reorder' ? '#f59e0b' : '#fff7ed',
                        color: interactiveTextType === 'reorder' ? '#fff' : '#b45309',
                      }}>
                      ترتيب الأجزاء
                    </button>
                  </div>
                </div>

                {/* Background color picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#b45309' }}>لون خلفية النص التفاعلي:</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { value: '', label: 'برتقالي', bg: '#fff7ed', border: '#fed7aa' },
                      { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
                      { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
                      { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
                      { value: '#fefce8', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
                      { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
                      { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
                    ].map((c) => (
                      <button key={c.value} type="button" title={c.label}
                        onClick={() => setInteractiveTextBgColor(c.value)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', border: `2px solid ${interactiveTextBgColor === c.value ? '#f59e0b' : c.border}`,
                          backgroundColor: c.bg, cursor: 'pointer', boxShadow: interactiveTextBgColor === c.value ? '0 0 0 2px #fbbf24' : 'none',
                        }} />
                    ))}
                    <input type="color" value={interactiveTextBgColor || '#fff7ed'}
                      onChange={(e) => setInteractiveTextBgColor(e.target.value)}
                      title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
                  </div>
                </div>

                {interactiveTextType === 'fill_blanks' ? (
                  <div>
                    {/* Rich editor with Insert Blank button */}
                    <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                      <SimpleHtmlEditor
                        value={interactiveTextContent}
                        onChange={(html) => setInteractiveTextContent(html || '')}
                        placeholder="اكتب النص التفاعلي هنا... استخدم زر 'إدراج فراغ' لإضافة فراغات {{a}}, {{b}}..."
                        dir="ltr"
                        editorRef={interactiveEditorRef}
                        extraToolbar={
                          <button
                            type="button"
                            title="إدراج فراغ"
                            onClick={() => {
                              const el = interactiveEditorRef.current;
                              if (!el) return;
                              el.focus();
                              const nextId = String.fromCharCode(97 + interactiveBlanks.length);
                              const placeholder = `{{${nextId}}}`;
                              document.execCommand('insertText', false, placeholder);
                              addInteractiveBlank();
                            }}
                            style={{
                              padding: '6px 10px', border: '1px solid #f59e0b', borderRadius: 6,
                              background: '#fbbf24', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                              color: '#78350f',
                            }}
                          >
                            إدراج فراغ
                          </button>
                        }
                      />
                    </Suspense>

                    {/* Blanks definitions */}
                    {interactiveBlanks.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#b45309', marginBottom: 6, display: 'block' }}>
                          تعريف الفراغات ({interactiveBlanks.length})
                        </label>
                        {interactiveBlanks.map((blank, bIdx) => (
                          <div key={bIdx} style={{
                            padding: 12, marginBottom: 8, backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a', borderRadius: 8
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                                فراغ {`{{${blank.id}}}`}
                              </span>
                              <button type="button" onClick={() => removeInteractiveBlank(bIdx)}
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                                حذف
                              </button>
                            </div>
                            {/* Type selector */}
                            <div style={{ marginBottom: 6 }}>
                              <label style={{ fontSize: 11, color: '#78350f' }}>نوع الإدخال:</label>
                              <select value={blank.type}
                                onChange={(e) => updateInteractiveBlank(bIdx, 'type', e.target.value)}
                                style={{ marginRight: 8, padding: '3px 8px', borderRadius: 4, border: '1px solid #fde68a', fontSize: 12 }}>
                                <option value="text">حقل نصي</option>
                                <option value="dropdown">قائمة منسدلة</option>
                              </select>
                            </div>
                            {/* Correct answers */}
                            <div style={{ marginBottom: 6 }}>
                              <label style={{ fontSize: 11, color: '#78350f', display: 'block', marginBottom: 4 }}>الإجابات الصحيحة:</label>
                              {blank.correctAnswers.map((ans, aIdx) => (
                                <div key={aIdx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                                  <input type="text" value={ans}
                                    onChange={(e) => updateBlankCorrectAnswer(bIdx, aIdx, e.target.value)}
                                    placeholder={`إجابة صحيحة ${aIdx + 1}`}
                                    style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #fde68a', fontSize: 12 }} />
                                  {blank.correctAnswers.length > 1 && (
                                    <button type="button" onClick={() => removeBlankCorrectAnswer(bIdx, aIdx)}
                                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>✕</button>
                                  )}
                                </div>
                              ))}
                              <button type="button" onClick={() => addBlankCorrectAnswer(bIdx)}
                                style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                + إجابة صحيحة أخرى
                              </button>
                            </div>
                            {/* Choices (for dropdown) */}
                            {blank.type === 'dropdown' && (
                              <div style={{ marginBottom: 6 }}>
                                <label style={{ fontSize: 11, color: '#78350f', display: 'block', marginBottom: 4 }}>خيارات القائمة:</label>
                                {blank.choices.map((ch, cIdx) => (
                                  <div key={cIdx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                                    <input type="text" value={ch}
                                      onChange={(e) => updateBlankChoice(bIdx, cIdx, e.target.value)}
                                      placeholder={`خيار ${cIdx + 1}`}
                                      style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #fde68a', fontSize: 12 }} />
                                    <button type="button" onClick={() => removeBlankChoice(bIdx, cIdx)}
                                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>✕</button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => addBlankChoice(bIdx)}
                                  style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                  + خيار جديد
                                </button>
                              </div>
                            )}
                            {/* Hint */}
                            <div>
                              <label style={{ fontSize: 11, color: '#78350f' }}>تلميح (اختياري):</label>
                              <input type="text" value={blank.hint || ''}
                                onChange={(e) => updateInteractiveBlank(bIdx, 'hint', e.target.value)}
                                placeholder="تلميح يظهر للطالب..."
                                style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #fde68a', fontSize: 12, marginTop: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Reorder parts */}
                    <p style={{ fontSize: 11, color: '#b45309', marginBottom: 8 }}>
                      أضف الأجزاء بالترتيب الصحيح — ستظهر للطالب مخلوطة
                    </p>
                    {interactiveReorderParts.map((part, pIdx) => (
                      <div key={pIdx} style={{
                        padding: 10, marginBottom: 8, backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a', borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>جزء {pIdx + 1} (ترتيب: {part.order})</span>
                          <button type="button" onClick={() => removeReorderPart(pIdx)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                            حذف
                          </button>
                        </div>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={part.text || ''}
                            onChange={(html) => updateReorderPart(pIdx, 'text', html)}
                            placeholder="نص هذا الجزء..."
                            dir="ltr"
                          />
                        </Suspense>
                      </div>
                    ))}
                    <button type="button" onClick={addReorderPart}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                        border: '1px solid #f59e0b', backgroundColor: '#fbbf24', color: '#78350f', cursor: 'pointer'
                      }}>
                      + جزء جديد
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : exerciseMode === 'speaking' ? (
            <div style={{ padding: 16, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
              {/* Content Blocks */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>بلوكات المحتوى</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => addContentBlock('paragraph')}
                    style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #fde68a', backgroundColor: '#fffbeb', color: '#92400e', cursor: 'pointer' }}>
                    + فقرة
                  </button>
                  <button type="button" onClick={() => addContentBlock('image')}
                    style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #c4b5fd', backgroundColor: '#f5f3ff', color: '#6d28d9', cursor: 'pointer' }}>
                    + صور
                  </button>
                  <button type="button" onClick={() => addContentBlock('cards')}
                    style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', color: '#134e4a', cursor: 'pointer' }}>
                    + بطاقات
                  </button>
                  <button type="button" onClick={() => addContentBlock('questions')}
                    style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1e40af', cursor: 'pointer' }}>
                    + أسئلة
                  </button>
                  <button type="button" onClick={() => addContentBlock('audio')}
                    style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #7dd3fc', backgroundColor: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>
                    + صوت
                  </button>
                </div>
              </div>

              {contentBlocks.length === 0 && (
                <p style={{ fontSize: 12, color: '#166534', textAlign: 'center', padding: 16, backgroundColor: '#dcfce7', borderRadius: 8 }}>
                  أضف فقرات أو صور أو بطاقات — ستظهر للطالب بالترتيب الذي تختاره
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contentBlocks.map((block, bIdx) => (
                  <div key={bIdx} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12, backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                          {block.type === 'paragraph' ? '📝 فقرة' : block.type === 'image' ? '🖼️ صور' : block.type === 'cards' ? '📋 بطاقات' : block.type === 'audio' ? '🎵 صوت' : '❓ أسئلة'} #{bIdx + 1}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => moveContentBlock(bIdx, -1)} disabled={bIdx === 0}
                          style={{ padding: '2px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: bIdx === 0 ? 'not-allowed' : 'pointer', backgroundColor: 'white', opacity: bIdx === 0 ? 0.4 : 1 }}>▲</button>
                        <button type="button" onClick={() => moveContentBlock(bIdx, 1)} disabled={bIdx === contentBlocks.length - 1}
                          style={{ padding: '2px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: bIdx === contentBlocks.length - 1 ? 'not-allowed' : 'pointer', backgroundColor: 'white', opacity: bIdx === contentBlocks.length - 1 ? 0.4 : 1 }}>▼</button>
                        <button type="button" onClick={() => removeContentBlock(bIdx)}
                          style={{ padding: '2px 8px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>حذف</button>
                      </div>
                    </div>

                    {/* Paragraph Block */}
                    {block.type === 'paragraph' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <label style={{ fontSize: 12, color: '#555' }}>لون الخلفية:</label>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {[
                              { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
                              { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
                              { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
                              { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
                              { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
                              { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
                              { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
                            ].map((c) => (
                              <button key={c.value} type="button" title={c.label}
                                onClick={() => updateContentBlock(bIdx, { bgColor: c.value })}
                                style={{
                                  width: 22, height: 22, borderRadius: '50%', border: `2px solid ${(block.bgColor || '') === c.value ? '#3b82f6' : c.border}`,
                                  backgroundColor: c.bg, cursor: 'pointer', boxShadow: (block.bgColor || '') === c.value ? '0 0 0 2px #93c5fd' : 'none',
                                }} />
                            ))}
                            <input type="color" value={block.bgColor || '#fefce8'}
                              onChange={(e) => updateContentBlock(bIdx, { bgColor: e.target.value })}
                              title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
                          </div>
                        </div>
                        <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                          <SimpleHtmlEditor
                            value={block.text || ''}
                            onChange={(html) => updateContentBlock(bIdx, { text: html })}
                            placeholder="اكتب الفقرة أو الصق من الوورد (المحاذاة وحجم الخط تُحفظ)"
                            dir="ltr"
                          />
                        </Suspense>
                      </div>
                    )}

                    {/* Image Block */}
                    {block.type === 'image' && (
                      <div>
                        <input type="file" id={`blockImg-${bIdx}`} multiple accept="image/*"
                          onChange={(e) => handleUploadBlockImages(bIdx, Array.from(e.target.files))}
                          style={{ display: 'none' }} />
                        <label htmlFor={`blockImg-${bIdx}`} style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                          {uploadingImages ? 'جاري الرفع...' : '📷 اختر صور'}
                        </label>
                        {(block.images || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                            {block.images.map((img, imgIdx) => (
                              <div key={imgIdx} style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: 140 }}>
                                <img src={img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                                <input type="text" value={img.description || ''} placeholder="وصف..."
                                  onChange={(e) => {
                                    const imgs = [...(block.images || [])];
                                    imgs[imgIdx] = { ...imgs[imgIdx], description: e.target.value };
                                    updateContentBlock(bIdx, { images: imgs });
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', fontSize: 11, border: 'none', borderTop: '1px solid #e5e7eb', boxSizing: 'border-box' }} />
                                <button type="button" onClick={() => removeBlockImage(bIdx, imgIdx)}
                                  style={{ position: 'absolute', top: 2, left: 2, background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', lineHeight: '18px' }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Questions Slot Block */}
                    {block.type === 'questions' && (
                      <div style={{ padding: 12, backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>عدد الأسئلة في هذا الموضع:</label>
                          <input
                            type="number"
                            min={1}
                            value={block.questionCount || 1}
                            onChange={(e) => updateContentBlock(bIdx, { questionCount: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 11, color: '#3b82f6' }}>
                            (الأسئلة {(() => {
                              let start = 1;
                              for (let i = 0; i < bIdx; i++) {
                                if (contentBlocks[i].type === 'questions') start += (contentBlocks[i].questionCount || 1);
                              }
                              const end = start + (block.questionCount || 1) - 1;
                              return start === end ? `#${start}` : `#${start} - #${end}`;
                            })()})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Cards Block */}
                    {block.type === 'cards' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          {(block.cards || []).length > 0 && (
                            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #16a34a' }}>
                              <button type="button" onClick={() => updateContentBlock(bIdx, { cardsLayout: 'horizontal' })}
                                style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: block.cardsLayout === 'horizontal' ? '#16a34a' : '#dcfce7', color: block.cardsLayout === 'horizontal' ? '#fff' : '#166534' }}>
                                ▤ أفقي
                              </button>
                              <button type="button" onClick={() => updateContentBlock(bIdx, { cardsLayout: 'vertical' })}
                                style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRight: '1px solid #16a34a', cursor: 'pointer', backgroundColor: block.cardsLayout === 'vertical' ? '#16a34a' : '#dcfce7', color: block.cardsLayout === 'vertical' ? '#fff' : '#166534' }}>
                                ▦ عمودي
                              </button>
                            </div>
                          )}
                          <button type="button" onClick={() => addCardToBlock(bIdx)}
                            style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid #16a34a', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer' }}>
                            + بطاقة
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: block.cardsLayout === 'horizontal' ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                          {(block.cards || []).map((card, cIdx) => {
                            const selColor = ADMIN_CARD_COLORS.find(c => c.key === card.color) || ADMIN_CARD_COLORS[cIdx % ADMIN_CARD_COLORS.length];
                            return (
                              <div key={cIdx} style={{ padding: 10, backgroundColor: selColor.bg, border: `2px solid ${selColor.border}`, borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: selColor.text }}>بطاقة {cIdx + 1}</span>
                                  <button type="button" onClick={() => removeCardFromBlock(bIdx, cIdx)}
                                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, padding: '1px 6px', fontSize: 10, cursor: 'pointer' }}>حذف</button>
                                </div>
                                {/* Color picker */}
                                <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
                                  {ADMIN_CARD_COLORS.map(c => (
                                    <button key={c.key} type="button" title={c.label} onClick={() => updateCardInBlock(bIdx, cIdx, 'color', c.key)}
                                      style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c.bg, border: `2px solid ${card.color === c.key ? c.text : c.border}`, cursor: 'pointer' }} />
                                  ))}
                                </div>
                                <Suspense fallback={<div style={{ padding: 4, color: '#999', fontSize: 11 }}>...</div>}>
                                  <SimpleHtmlEditor
                                    value={card.title || ''}
                                    onChange={(html) => updateCardInBlock(bIdx, cIdx, 'title', html)}
                                    placeholder="عنوان البطاقة"
                                    dir="ltr"
                                  />
                                </Suspense>
                                {/* Multiple text entries */}
                                {(card.texts || []).map((entry, tIdx) => (
                                  <div key={tIdx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                      <input type="text" value={entry.label || ''} onChange={(e) => updateCardText(bIdx, cIdx, tIdx, 'label', e.target.value)}
                                        placeholder="عنوان فرعي (اختياري)"
                                        style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: `1px solid ${selColor.border}`, fontSize: 11, marginBottom: 2, boxSizing: 'border-box', backgroundColor: 'white' }} />
                                      <Suspense fallback={<div style={{ padding: 4, color: '#999', fontSize: 11 }}>...</div>}>
                                        <SimpleHtmlEditor
                                          value={entry.content || ''}
                                          onChange={(html) => updateCardText(bIdx, cIdx, tIdx, 'content', html)}
                                          placeholder="محتوى..."
                                          dir="ltr"
                                        />
                                      </Suspense>
                                    </div>
                                    {(card.texts || []).length > 1 && (
                                      <button type="button" onClick={() => removeTextFromCard(bIdx, cIdx, tIdx)}
                                        style={{ background: 'none', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px', marginTop: 2 }}>✕</button>
                                    )}
                                  </div>
                                ))}
                                <button type="button" onClick={() => addTextToCard(bIdx, cIdx)}
                                  style={{ padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: `1px solid ${selColor.border}`, backgroundColor: 'white', color: selColor.text, cursor: 'pointer', marginTop: 2 }}>
                                  + نص إضافي
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Audio Block */}
                    {block.type === 'audio' && (
                      <div style={{ padding: 12, backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8 }}>
                        {block.audioUrl ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ color: '#0369a1', fontWeight: 600, fontSize: 13 }}>✅ تم رفع الصوت</span>
                              <button type="button" onClick={() => updateContentBlock(bIdx, { audioUrl: null })}
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                                ✕ إزالة
                              </button>
                            </div>
                            <audio controls preload="metadata"
                              src={block.audioUrl.startsWith('http') ? block.audioUrl : `${API_BASE_URL}${block.audioUrl}`}
                              style={{ width: '100%' }} />
                          </div>
                        ) : block.audioFile ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12 }}>🎵 {block.audioFile.name}</span>
                              <button type="button" onClick={() => { if (block.audioPreview) URL.revokeObjectURL(block.audioPreview); updateContentBlock(bIdx, { audioFile: null, audioPreview: null }); }}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>✕</button>
                            </div>
                            {block.audioPreview && <audio controls preload="metadata" src={block.audioPreview} style={{ width: '100%', marginBottom: 6 }} />}
                            <button type="button" onClick={() => handleUploadBlockAudio(bIdx)} disabled={block._uploading}
                              style={{ padding: '6px 16px', backgroundColor: block._uploading ? '#94a3b8' : '#0284c7', color: 'white', border: 'none', borderRadius: 6, cursor: block._uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                              {block._uploading ? 'جاري الرفع...' : '⬆️ رفع الصوت'}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input type="file" id={`blockAudio-${bIdx}`} accept="audio/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) updateContentBlock(bIdx, { audioFile: file, audioPreview: URL.createObjectURL(file) });
                              }}
                              style={{ display: 'none' }} />
                            <label htmlFor={`blockAudio-${bIdx}`}
                              style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#0284c7', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                              🎵 اختر ملف صوتي
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {contentBlocks.length > 0 && (() => {
                const totalSlotted = contentBlocks.filter(b => b.type === 'questions').reduce((sum, b) => sum + (b.questionCount || 0), 0);
                const hasQuestionSlots = contentBlocks.some(b => b.type === 'questions');
                return (
                  <div style={{ margin: '8px 0 0' }}>
                    {hasQuestionSlots && totalSlotted !== questions.length && (
                      <p style={{ fontSize: 12, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', marginBottom: 4 }}>
                        تنبيه: مجموع الأسئلة في البلوكات ({totalSlotted}) لا يساوي عدد الأسئلة الفعلية ({questions.length})
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#166534' }}>
                      {hasQuestionSlots
                        ? 'الأسئلة ستظهر موزعة بين بلوكات المحتوى حسب الترتيب'
                        : 'جميع الأسئلة أدناه ستظهر مع هذا المحتوى كتمرين واحد'}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : listeningClipId ? (
            <div style={{ padding: 12, backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#1e40af', fontWeight: 600, fontSize: 14 }}>
                  ✅ تم اختيار ملف الاستماع
                </span>
                <button
                  type="button"
                  onClick={handleRemoveClip}
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                >
                  ✕ إزالة
                </button>
              </div>
              {clipAudioUrl && (
                <audio controls preload="metadata" src={clipAudioUrl.startsWith('http') ? clipAudioUrl : `${API_BASE_URL}${clipAudioUrl}`} style={{ width: '100%', marginTop: 8 }}>
                  المتصفح لا يدعم تشغيل الملفات الصوتية
                </audio>
              )}
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>ID: {listeningClipId}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Existing clips */}
              {loadingClips ? (
                <p style={{ fontSize: 13, color: '#64748b' }}>جاري تحميل التسجيلات...</p>
              ) : sectionClips.length > 0 && (
                <div style={{ padding: 12, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#0369a1' }}>
                    اختر من التسجيلات الموجودة:
                  </label>
                  <select
                    onChange={(e) => {
                      const clip = sectionClips.find(c => (c.listeningClipId || c._id || c.id) === e.target.value);
                      if (clip) handleSelectClip(clip);
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #bae6fd', fontSize: 14 }}
                  >
                    <option value="">-- اختر تسجيل --</option>
                    {sectionClips.map(clip => {
                      const id = clip.listeningClipId || clip._id || clip.id;
                      return (
                        <option key={id} value={id}>
                          {clip.title || clip.audioUrl?.split('/').pop() || `Clip ${id?.slice(-6)}`}
                          {clip.questionCount ? ` (${clip.questionCount} سؤال)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Upload new */}
              <div style={{ padding: 12, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#9a3412' }}>
                  {sectionClips.length > 0 ? 'أو ارفع تسجيلاً جديداً:' : 'ارفع ملف استماع:'}
                </label>
                {!audioFile ? (
                  <div>
                    <input
                      type="file"
                      id="bulkAudioFile"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAudioFile(file);
                          setAudioPreview(URL.createObjectURL(file));
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="bulkAudioFile" style={{
                      display: 'inline-block', padding: '8px 16px', backgroundColor: '#fb923c', color: 'white',
                      borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>
                      🎵 اختر ملف صوتي
                    </label>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9a3412' }}>MP3, WAV, OGG - الحد الأقصى 50MB</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13 }}>🎵 {audioFile.name}</span>
                      <button type="button" onClick={() => { setAudioFile(null); setAudioPreview(null); }}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                    {audioPreview && <audio controls preload="metadata" src={audioPreview} style={{ width: '100%', marginBottom: 8 }} />}
                    <button
                      type="button"
                      onClick={handleUploadAudio}
                      disabled={uploading}
                      style={{
                        padding: '8px 20px', backgroundColor: uploading ? '#94a3b8' : '#22c55e', color: 'white',
                        border: 'none', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
                      }}
                    >
                      {uploading ? 'جاري الرفع...' : '⬆️ رفع الملف'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Questions */}
      {(listeningClipId || (exerciseMode !== 'audio' && examId && sectionKey)) && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#334155' }}>
              3. أضف الأسئلة ({questions.length} سؤال)
            </h3>
            <button
              type="button"
              onClick={addQuestion}
              style={{
                padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}
            >
              + سؤال جديد
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, qi) => (
              <div key={q.id} style={{
                padding: 16, border: '1px solid #e2e8f0', borderRadius: 10,
                backgroundColor: qi % 2 === 0 ? '#f8fafc' : '#ffffff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>سؤال {qi + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(q.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer' }}>
                      حذف
                    </button>
                  )}
                </div>

                {/* Question type + points */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>نوع السؤال</label>
                    <select
                      value={q.qType}
                      onChange={(e) => updateQuestion(q.id, 'qType', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                    >
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>النقاط</label>
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 1)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                    />
                  </div>
                </div>

                {/* Prompt */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>نص السؤال *</label>
                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) => updateQuestion(q.id, 'prompt', e.target.value)}
                    placeholder="اكتب نص السؤال هنا..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, marginTop: 2 }}
                  />
                </div>

                {/* MCQ Options */}
                {q.qType === 'mcq' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>الخيارات (اضغط الدائرة للإجابة الصحيحة)</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <button
                          type="button"
                          onClick={() => updateOption(q.id, oi, 'isCorrect', true)}
                          style={{
                            width: 22, height: 22, borderRadius: '50%', border: `2px solid ${opt.isCorrect ? '#22c55e' : '#cbd5e1'}`,
                            backgroundColor: opt.isCorrect ? '#22c55e' : 'white', cursor: 'pointer', flexShrink: 0
                          }}
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOption(q.id, oi, 'text', e.target.value)}
                          placeholder={`خيار ${oi + 1}`}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                        {q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(q.id, oi)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(q.id)}
                      style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      + خيار جديد
                    </button>
                  </div>
                )}

                {/* True/False */}
                {q.qType === 'true_false' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الإجابة الصحيحة:</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      {[true, false].map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => updateQuestion(q.id, 'answerKeyBoolean', val)}
                          style={{
                            padding: '6px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: q.answerKeyBoolean === val ? '2px solid #22c55e' : '1px solid #cbd5e1',
                            backgroundColor: q.answerKeyBoolean === val ? '#dcfce7' : 'white',
                            color: q.answerKeyBoolean === val ? '#16a34a' : '#64748b',
                          }}
                        >
                          {val ? 'صحيح (Richtig)' : 'خطأ (Falsch)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fill */}
                {q.qType === 'fill' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الإجابة الصحيحة *</label>
                    <input
                      type="text"
                      value={q.fillExact}
                      onChange={(e) => updateQuestion(q.id, 'fillExact', e.target.value)}
                      placeholder="اكتب الإجابة الصحيحة..."
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                    />
                  </div>
                )}

                {/* Match */}
                {q.qType === 'match' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>أزواج التوصيل:</label>
                    {q.answerKeyMatch.map((pair, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <input
                          type="text" value={pair.left}
                          onChange={(e) => updateMatchPair(q.id, pi, 'left', e.target.value)}
                          placeholder="يسار" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                        <span style={{ color: '#94a3b8' }}>→</span>
                        <input
                          type="text" value={pair.right}
                          onChange={(e) => updateMatchPair(q.id, pi, 'right', e.target.value)}
                          placeholder="يمين" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                        {q.answerKeyMatch.length > 1 && (
                          <button type="button" onClick={() => removeMatchPair(q.id, pi)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addMatchPair(q.id)}
                      style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      + زوج جديد
                    </button>
                  </div>
                )}

                {/* Reorder */}
                {q.qType === 'reorder' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الترتيب الصحيح (مفصول بفواصل):</label>
                    <input
                      type="text"
                      value={q.reorderInput || ''}
                      onChange={(e) => updateQuestion(q.id, 'reorderInput', e.target.value)}
                      placeholder="مثال: الأول, الثاني, الثالث"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            style={{
              width: '100%', marginTop: 12, padding: '10px', border: '2px dashed #cbd5e1', borderRadius: 8,
              backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: 14, color: '#64748b', fontWeight: 600
            }}
          >
            + إضافة سؤال آخر
          </button>
        </div>
      )}

      {/* Submit button */}
      {(listeningClipId || (!useAudio && examId && sectionKey)) && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 40px', backgroundColor: loading ? '#94a3b8' : '#22c55e', color: 'white',
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? 'جاري الحفظ...' : questions.some(q => q.prompt.trim()) ? `حفظ ${questions.filter(q => q.prompt.trim()).length} سؤال` : 'حفظ المحتوى'}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginTop: 20, background: 'white', border: '1px solid #86efac', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#16a34a', marginBottom: 12 }}>
            نتيجة الإنشاء
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ padding: 8, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{results.success}</div>
              <div style={{ fontSize: 11, color: '#16a34a' }}>نجح</div>
            </div>
            <div style={{ padding: 8, backgroundColor: results.failed > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: results.failed > 0 ? '#dc2626' : '#64748b' }}>{results.failed}</div>
              <div style={{ fontSize: 11, color: results.failed > 0 ? '#dc2626' : '#64748b' }}>فشل</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#334155' }}>{results.total}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>المجموع</div>
            </div>
          </div>

          {results.results && results.results.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', marginBottom: 4, borderRadius: 6,
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13
            }}>
              <span>سؤال {r.index + 1}: {r.prompt?.slice(0, 50)}{r.prompt?.length > 50 ? '...' : ''}</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{r.qType} ({r.points} نقطة)</span>
            </div>
          ))}

          {results.errors && results.errors.map((e, i) => (
            <div key={i} style={{
              padding: '8px 12px', marginBottom: 4, borderRadius: 6,
              backgroundColor: '#fef2f2', border: '1px solid #fca5a5', fontSize: 13, color: '#dc2626'
            }}>
              سؤال {e.index + 1}: {e.error}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
            <button
              onClick={() => {
                setQuestions([emptyQuestion()]);
                setResults(null);
                setSuccess('');
                setReadingPassage('');
                setReadingCards([]);
                setWritingPassage('');
                setWritingCards([]);
                setInteractiveTextContent('');
                setInteractiveBlanks([]);
                setInteractiveReorderParts([]);
                setInteractiveTextBgColor('');
                setWritingPassageBgColor('');
              }}
              style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              إضافة أسئلة أخرى {useAudio ? 'لنفس التسجيل' : 'لنفس القسم'}
            </button>
            {useAudio && (
              <button
                onClick={() => {
                  setQuestions([emptyQuestion()]);
                  setResults(null);
                  setSuccess('');
                  setListeningClipId(null);
                  setClipAudioUrl(null);
                }}
                style={{ padding: '8px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                اختيار تسجيل مختلف
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkCreateQuestions;
