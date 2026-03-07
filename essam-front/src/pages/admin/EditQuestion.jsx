import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { questionsAPI } from '../../services/questionsAPI';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import axios from 'axios';
import { useLevels } from '../../hooks/useLevels';
import './CreateQuestion.css';

const RichTextEditor = lazy(() => import('../../components/RichTextEditor'));
const SimpleHtmlEditor = lazy(() => import('../../components/SimpleHtmlEditor'));

// API Base URL
const API_BASE_URL = 'https://api.deutsch-tests.com';

// ✅ دالة لبناء URL من key مع encoding صحيح
const buildImageUrlFromKey = (key) => {
  if (!key) {
    console.warn('⚠️ buildImageUrlFromKey: key is empty');
    return '';
  }
  
  try {
    // إذا كان key يبدأ بـ http، نعيده كما هو
    if (key.startsWith('http://') || key.startsWith('https://')) {
      console.log('✅ Key is already a full URL:', key);
      return key;
    }
    
    // إذا كان key يبدأ بـ /uploads/ أو /images/، نضيف base URL فقط
    if (key.startsWith('/uploads/') || key.startsWith('/images/')) {
      const fullUrl = `${API_BASE_URL}${key}`;
      console.log('✅ Building URL from absolute path:', { key, fullUrl });
      return fullUrl;
    }
    
    // إذا كان key يبدأ بـ uploads/ أو images/ بدون /، نضيف / و base URL
    if (key.startsWith('uploads/') || key.startsWith('images/')) {
      const fullUrl = `${API_BASE_URL}/${key}`;
      console.log('✅ Building URL from relative path:', { key, fullUrl });
      return fullUrl;
    }
    
    // غير ذلك، نقسم key على / ونعمل encoding على كل جزء
    const segments = key.split('/');
    const encodedSegments = segments.map(segment => {
      return encodeURIComponent(segment);
    });
    const encodedPath = encodedSegments.join('/');
    const fullUrl = `${API_BASE_URL}/uploads/${encodedPath}`;
    console.log('✅ Building URL from key with encoding:', { key, encodedPath, fullUrl });
    return fullUrl;
  } catch (error) {
    console.error('❌ Error building URL from key:', key, error);
    return `${API_BASE_URL}/uploads/${key}`;
  }
};

// ✅ دالة لبناء URL الصورة بشكل صحيح مع encoding للأحرف الخاصة
const getImageUrl = (image) => {
  if (!image) {
    console.warn('⚠️ getImageUrl: image is null or undefined');
    return null;
  }
  
  // إذا كان URL كامل موجود ويبدأ بـ http، نستخدمه لكن نصلح encoding
  if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
    try {
      const urlObj = new URL(image.url);
      // إذا كان pathname يحتوي على أحرف غير encoded (مثل العربية أو الألمانية)
      // نحتاج لإعادة بناء المسار مع encoding صحيح
      const pathSegments = urlObj.pathname.split('/').filter(s => s);
      const encodedSegments = pathSegments.map(segment => {
        // إذا كان Segment يحتوي على أحرف غير ASCII، نعمل encoding
        try {
          // نحاول decode أولاً لنرى إذا كان encoded بالفعل
          const decoded = decodeURIComponent(segment);
          // إذا كان decode نجح ونتيجته مختلفة، يعني كان encoded
          // لكن قد يحتاج re-encoding بشكل صحيح
          return encodeURIComponent(decoded);
        } catch (e) {
          // إذا decode فشل، يعني Segment غير encoded، نعمل encoding
          return encodeURIComponent(segment);
        }
      });
      
      const encodedPath = '/' + encodedSegments.join('/');
      const newUrl = `${urlObj.origin}${encodedPath}${urlObj.search}${urlObj.hash}`;
      
      console.log('✅ Fixed URL encoding:', {
        original: image.url,
        fixed: newUrl,
        pathname: urlObj.pathname,
        encodedPath: encodedPath
      });
      
      return newUrl;
    } catch (e) {
      // إذا فشل parsing، نستخدم URL كما هو
      console.log('⚠️ URL parsing failed, using as-is:', image.url);
      return image.url;
    }
  }
  
  // إذا كان key موجود، نبني URL منه
  if (image.key) {
    const builtUrl = buildImageUrlFromKey(image.key);
    console.log('✅ Built URL from key:', builtUrl);
    return builtUrl;
  }
  
  // إذا كان url موجود لكن غير كامل
  if (image.url) {
    // إذا كان يبدأ بـ /uploads/ أو images/
    if (image.url.startsWith('/uploads/') || image.url.startsWith('/images/')) {
      // نعمل encoding على المسار
      const pathSegments = image.url.split('/').filter(s => s);
      const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
      const encodedPath = '/' + encodedSegments.join('/');
      const fullUrl = `${API_BASE_URL}${encodedPath}`;
      console.log('✅ Built URL from absolute path:', fullUrl);
      return fullUrl;
    }
    // إذا كان يبدأ بـ uploads/ أو images/ بدون /
    if (image.url.startsWith('uploads/') || image.url.startsWith('images/')) {
      const pathSegments = image.url.split('/');
      const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
      const encodedPath = encodedSegments.join('/');
      const fullUrl = `${API_BASE_URL}/${encodedPath}`;
      console.log('✅ Built URL from relative path:', fullUrl);
      return fullUrl;
    }
    // غير ذلك، نضيف /uploads/
    const encodedUrl = encodeURIComponent(image.url);
    const fullUrl = `${API_BASE_URL}/uploads/${encodedUrl}`;
    console.log('✅ Built URL with /uploads/ prefix:', fullUrl);
    return fullUrl;
  }
  
  console.warn('⚠️ No URL or key found for image:', image);
  return null;
};

// Providers constant - lowercase values for backend, capitalized labels for display
const PROVIDERS = [
  { value: 'goethe', label: 'Goethe' },
  { value: 'telc', label: 'TELC' },
  { value: 'osd', label: 'ÖSD' },
  { value: 'ecl', label: 'ECL' },
  { value: 'dtb', label: 'DTB' },
  { value: 'dtz', label: 'DTZ' },
  { value: 'deutschland-in-leben', label: 'Deutschland-in-Leben' },
  { value: 'grammatik', label: 'Grammatik' },
  { value: 'wortschatz', label: 'Wortschatz' },
];

// المستويات حسب المزود
const getLevelsForProvider = (provider, allLevels) => {
  const p = (provider || '').toLowerCase();
  if (p === 'dtz') return ['B1'];
  if (p === 'dtb') return allLevels.filter((l) => l !== 'A1');
  return allLevels;
};

function EditQuestion() {
  const { levelNames } = useLevels();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [loading, setLoading] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useRichEditor, setUseRichEditor] = useState(false); // ✅ محرر غني للنصوص HTML (من الوورد)

  // Form state
  const [formData, setFormData] = useState({
    prompt: '',
    qType: 'mcq',
    options: [{ text: '', isCorrect: false }],
    fillExact: '',
    regexList: [],
    answerKeyBoolean: true,
    answerKeyMatch: [{ left: '', right: '' }],
    matchLeftItems: [''],
    matchRightItems: ['', ''],
    matchCorrect: [0],
    answerKeyReorder: [],
    provider: 'deutschland-in-leben',
    section: '',
    level: 'B1',
    tags: [],
    status: 'published',
    questionType: 'general',
    selectedState: '',
    // Leben in Deutschland fields
    usageCategory: '',
    mainSkill: '',
    images: [],
    // Interactive Text fields
    interactiveTextType: 'fill_blanks',
    text: '',
    interactiveBlanks: [],
    interactiveReorder: { parts: [] },
    // Free Text fields
    sampleAnswer: '',
    minWords: '',
    maxWords: '',
    // Speaking fields
    modelAnswerText: '',
    minSeconds: '',
    maxSeconds: '',
  });

  const [newTag, setNewTag] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Content-only question state
  const [isContentOnly, setIsContentOnly] = useState(false);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [savingContent, setSavingContent] = useState(false);
  // فتح محرر المحتوى التعليمي من صفحة تعديل السؤال العادي (عند وجود بلوكات)
  const [showContentBlocksEditor, setShowContentBlocksEditor] = useState(false);

  // ✅ Reading passage + cards (من BulkCreateQuestions)
  const [readingPassage, setReadingPassage] = useState('');
  const [readingPassageBgColor, setReadingPassageBgColor] = useState('');
  const [readingCards, setReadingCards] = useState([]);
  const [cardsLayout, setCardsLayout] = useState('vertical');

  // قائمة الولايات الألمانية
  const germanStates = [
    'Baden-Württemberg',
    'Bayern',
    'Berlin',
    'Brandenburg',
    'Bremen',
    'Hamburg',
    'Hessen',
    'Mecklenburg-Vorpommern',
    'Niedersachsen',
    'Nordrhein-Westfalen',
    'Rheinland-Pfalz',
    'Saarland',
    'Sachsen',
    'Sachsen-Anhalt',
    'Schleswig-Holstein',
    'Thüringen',
  ];

  // تحميل بيانات السؤال
  useEffect(() => {
    if (id) {
      loadQuestion();
    }
  }, [id]);

  const loadQuestion = async () => {
    try {
      setLoadingQuestion(true);
      setError('');
      console.log('🔄 Loading question with ID:', id);
      const question = await questionsAPI.getById(id);
      console.log('✅ Question loaded successfully:', question);
      
      // استخراج usageCategory و state من السؤال
      let usageCategory = '';
      let selectedState = '';
      let mainSkill = '';

      const providerLower = (question.provider || '').toLowerCase();

      // تحديد usageCategory من provider و tags
      if (providerLower === 'leben_in_deutschland' || providerLower === 'deutschland-in-leben' || providerLower === 'lid') {
        if (question.usageCategory === 'common' || question.tags?.includes('300-Fragen')) {
          usageCategory = 'common';
        } else if (question.usageCategory === 'state_specific' || question.state) {
          usageCategory = 'state_specific';
          selectedState = question.state || question.tags?.find(tag => germanStates.includes(tag)) || '';
        }
        mainSkill = question.mainSkill || 'leben_test';
      } else if (providerLower === 'grammatik' || providerLower === 'wortschatz') {
        usageCategory = 'grammar';
      } else if (['goethe', 'telc', 'osd', 'ecl', 'dtb', 'dtz'].includes(providerLower)) {
        usageCategory = 'provider';
      }

      // إذا كان usageCategory محفوظ في السؤال نفسه، نستخدمه
      if (question.usageCategory && !usageCategory) {
        usageCategory = question.usageCategory;
      }

      // إذا السؤال تابع لامتحان ولم نحدد usageCategory، نعتبره provider
      if (!usageCategory && question.examId) {
        usageCategory = 'provider';
      }

      // تحويل البيانات من API format إلى form format
      // معالجة options - قد تكون array من objects أو strings
      let options = [];
      if (question.options && Array.isArray(question.options)) {
        if (question.options.length > 0 && typeof question.options[0] === 'string') {
          // إذا كانت strings، نحولها إلى objects
          options = question.options.map((opt, idx) => ({
            text: opt,
            isCorrect: question.correctAnswerIndex === idx || 
                      (Array.isArray(question.correctAnswerIndex) && question.correctAnswerIndex.includes(idx)) ||
                      false,
          }));
        } else {
          // إذا كانت objects بالفعل
          options = question.options.map(opt => ({
            text: opt.text || opt,
            isCorrect: opt.isCorrect !== undefined ? opt.isCorrect : false,
          }));
        }
      } else {
        options = [{ text: '', isCorrect: false }];
      }

      // معالجة answerKeyMatch → matchLeftItems, matchRightItems, matchCorrect (واجهة مرنة)
      // استخدام matchRightOptions عند وجوده لضمان عدم فقدان عناصر اليمين (المضللة)
      let answerKeyMatch = [];
      let matchLeftItems = [''];
      let matchRightItems = ['', ''];
      let matchCorrect = [0];
      if (question.answerKeyMatch && Array.isArray(question.answerKeyMatch) && question.answerKeyMatch.length > 0) {
        const pairs = question.answerKeyMatch[0] && Array.isArray(question.answerKeyMatch[0])
          ? question.answerKeyMatch.map(pair => ({ left: pair[0] || '', right: pair[1] || '' }))
          : question.answerKeyMatch.map(pair => ({ left: pair.left || pair[0] || '', right: pair.right || pair[1] || '' }));
        answerKeyMatch = pairs;
        matchLeftItems = pairs.map(p => p.left ?? '');
        const rightsFromPairs = pairs.map(p => (p.right ?? '').trim()).filter(Boolean);
        const hasRightOptions = question.matchRightOptions && Array.isArray(question.matchRightOptions) && question.matchRightOptions.length > 0;
        if (hasRightOptions && question.matchRightOptions.length >= rightsFromPairs.length) {
          matchRightItems = [...question.matchRightOptions.map(s => String(s ?? '').trim()), ''];
          matchCorrect = pairs.map(({ right }) => {
            const r = (right ?? '').trim();
            const idx = question.matchRightOptions.findIndex((o) => String(o || '').trim() === r);
            return idx >= 0 ? idx : 0;
          });
        } else {
          matchRightItems = pairs.length ? [...pairs.map(p => p.right ?? ''), ''] : ['', ''];
          matchCorrect = pairs.map((_, i) => i);
        }
      }

      // Normalize provider to lowercase for backend compatibility
      const normalizeProvider = (provider) => {
        if (!provider) return 'deutschland-in-leben';
        const providerLower = provider.toLowerCase();
        // Map old values to new lowercase values
        const providerMap = {
          'goethe': 'goethe',
          'telc': 'telc',
          'télc': 'telc',
          'ösd': 'osd',
          'osd': 'osd',
          'ecl': 'ecl',
          'dtb': 'dtb',
          'dtz': 'dtz',
          'deutschland-in-leben': 'deutschland-in-leben',
          'leben in deutschland': 'deutschland-in-leben',
          'lid': 'deutschland-in-leben',
          'grammatik': 'grammatik',
          'wortschatz': 'wortschatz',
        };
        return providerMap[providerLower] || providerLower;
      };

      const normalizedProvider = normalizeProvider(question.provider);

      // 🔥 معالجة الصور بشكل صحيح
      let images = [];
      console.log('🖼️ Raw question data:', {
        hasImages: !!question.images,
        imagesLength: question.images?.length,
        images: question.images,
        hasMedia: !!question.media,
        media: question.media
      });

      if (Array.isArray(question.images) && question.images.length > 0) {
        // إذا كان هناك images array
        images = question.images.map((img, idx) => {
          const imageUrl = getImageUrl(img);
          console.log(`🖼️ Processing image ${idx + 1}:`, {
            original: img,
            key: img.key,
            url: img.url,
            builtUrl: imageUrl,
            description: img.description
          });
          
          return {
            type: img.type || 'image',
            key: img.key || '',
            url: imageUrl || '',
            mime: img.mime || 'image/jpeg',
            provider: img.provider || 's3',
            description: img.description || ''
          };
        });
      } else if (question.media && question.media.type === 'image') {
        // إذا كان هناك media واحد من نوع image
        const imageUrl = getImageUrl(question.media);
        console.log('🖼️ Processing media image:', {
          original: question.media,
          key: question.media.key,
          url: question.media.url,
          builtUrl: imageUrl,
          description: question.media.description
        });
        
        images = [{
          type: question.media.type || 'image',
          key: question.media.key || '',
          url: imageUrl || '',
          mime: question.media.mime || 'image/jpeg',
          provider: question.media.provider || 's3',
          description: question.media.description || ''
        }];
      }

      console.log('🖼️ Final processed images:', images);

      // معالجة بيانات Interactive Text
      let interactiveBlanks = [];
      if (Array.isArray(question.interactiveBlanks) && question.interactiveBlanks.length > 0) {
        interactiveBlanks = question.interactiveBlanks.map(blank => ({
          id: blank.id || '',
          type: blank.type || 'textInput',
          correctAnswers: Array.isArray(blank.correctAnswers) ? blank.correctAnswers : [],
          choices: Array.isArray(blank.choices) ? blank.choices : [],
          hint: blank.hint || '',
        }));
      }

      let interactiveReorder = { parts: [] };
      if (question.interactiveReorder && Array.isArray(question.interactiveReorder.parts)) {
        interactiveReorder = {
          parts: question.interactiveReorder.parts.map(part => ({
            id: part.id || '',
            text: part.text || '',
            order: part.order || 0,
          })),
        };
      }

      // تحديد نوع Interactive Text
      let interactiveTextType = 'fill_blanks';
      if (interactiveBlanks.length > 0) {
        interactiveTextType = 'fill_blanks';
      } else if (interactiveReorder.parts.length > 0) {
        interactiveTextType = 'reorder';
      }

      // ✅ إذا النص فيه HTML (جاي من محرر الوورد) → نفعّل المحرر الغني
      if (/<[a-z][\s\S]*>/i.test(question.prompt || '')) {
        setUseRichEditor(true);
      }

      setFormData({
        prompt: question.prompt || '',
        qType: question.qType || 'mcq',
        options: options.length > 0 ? options : [{ text: '', isCorrect: false }],
        fillExact: question.fillExact || '',
        regexList: Array.isArray(question.regexList) ? question.regexList : [],
        answerKeyBoolean: question.answerKeyBoolean !== undefined ? question.answerKeyBoolean : true,
        answerKeyMatch: answerKeyMatch,
        matchLeftItems,
        matchRightItems,
        matchCorrect,
        answerKeyReorder: Array.isArray(question.answerKeyReorder) ? question.answerKeyReorder : [],
        provider: normalizedProvider,
        section: question.section || '',
        level: question.level || 'B1',
        tags: Array.isArray(question.tags) ? question.tags : [],
        status: question.status || 'published',
        questionType: selectedState ? 'state' : 'general',
        selectedState: selectedState,
        usageCategory: usageCategory,
        mainSkill: mainSkill,
        images: images,
        // Interactive Text fields
        interactiveTextType: interactiveTextType,
        text: question.interactiveText || question.text || '',
        interactiveBlanks: interactiveBlanks,
        interactiveReorder: interactiveReorder,
        // Free Text fields
        sampleAnswer: question.sampleAnswer || '',
        minWords: question.minWords || '',
        maxWords: question.maxWords || '',
        // Speaking fields
        modelAnswerText: question.modelAnswerText || '',
        minSeconds: question.minSeconds || '',
        maxSeconds: question.maxSeconds || '',
      });

      // إذا كان السؤال contentOnly (محتوى تعليمي فقط)
      if (question.contentOnly) {
        setIsContentOnly(true);
      }
      // تحميل بلوكات المحتوى (فقرة/صوت/بطاقات) — دعم مصفوفة أو JSON string من الـ API
      let blocks = question.contentBlocks;
      if (typeof blocks === 'string') {
        try {
          blocks = JSON.parse(blocks);
        } catch (_) {
          blocks = [];
        }
      }
      if (Array.isArray(blocks) && blocks.length > 0) {
        setContentBlocks(blocks);
      } else {
        setContentBlocks(Array.isArray(blocks) ? blocks : []);
      }

      // ✅ تحميل فقرة القراءة والبطاقات (من BulkCreateQuestions)
      if (question.readingPassage) setReadingPassage(question.readingPassage);
      if (question.readingPassageBgColor) setReadingPassageBgColor(question.readingPassageBgColor);
      if (Array.isArray(question.readingCards) && question.readingCards.length > 0) setReadingCards(question.readingCards);
      if (question.cardsLayout) setCardsLayout(question.cardsLayout);

      // إذا كان هناك media (صوت)
      if (question.media && question.media.type === 'audio') {
        setAudioPreview(question.media.url || question.mediaUrl);
      }
    } catch (err) {
      console.error('❌ Error loading question:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        questionId: id,
      });
      
      let errorMessage = 'حدث خطأ أثناء تحميل السؤال';
      
      if (err.response?.status === 404) {
        errorMessage = 'السؤال غير موجود. قد يكون تم حذفه أو الـ ID غير صحيح.';
      } else if (err.response?.status === 403) {
        errorMessage = 'ليس لديك صلاحية لعرض هذا السؤال.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : JSON.stringify(err.response.data.error);
      }
      
      setError(errorMessage);
      
      // إذا كان السؤال غير موجود (404)، عرض رسالة واضحة
      if (err.response?.status === 404) {
        setTimeout(() => {
          if (window.confirm('السؤال غير موجود. هل تريد العودة إلى قائمة الأسئلة؟')) {
            navigate(returnTo || '/admin/questions');
          }
        }, 2000);
      }
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // إذا تغير نوع السؤال (qType)، نعيد تعيين الحقول
      if (name === 'qType') {
        if (value === 'mcq') {
          updated.options = prev.options?.length > 0 ? prev.options : [{ text: '', isCorrect: false }];
        } else if (value === 'true_false') {
          updated.answerKeyBoolean = prev.answerKeyBoolean !== undefined ? prev.answerKeyBoolean : true;
        } else if (value === 'fill') {
          updated.fillExact = prev.fillExact || '';
          updated.regexList = prev.regexList?.length > 0 ? prev.regexList : [];
        } else if (value === 'match') {
          updated.answerKeyMatch = prev.answerKeyMatch?.length > 0 ? prev.answerKeyMatch : [{ left: '', right: '' }];
          if (!prev.matchLeftItems || !prev.matchRightItems) {
            const pairs = updated.answerKeyMatch;
            updated.matchLeftItems = pairs.map(p => p.left ?? '');
            updated.matchRightItems = pairs.length ? [...pairs.map(p => p.right ?? ''), ''] : ['', ''];
            updated.matchCorrect = pairs.map((_, i) => i);
          }
        } else if (value === 'reorder') {
          updated.answerKeyReorder = prev.answerKeyReorder?.length > 0 ? prev.answerKeyReorder : [];
        } else if (value === 'interactive_text') {
          updated.interactiveTextType = prev.interactiveTextType || 'fill_blanks';
          updated.text = prev.text || '';
          updated.interactiveBlanks = prev.interactiveBlanks?.length > 0 ? prev.interactiveBlanks : [];
          updated.interactiveReorder = prev.interactiveReorder?.parts?.length > 0 ? prev.interactiveReorder : { parts: [] };
        } else if (value === 'free_text') {
          updated.sampleAnswer = prev.sampleAnswer || '';
        } else if (value === 'speaking') {
          updated.modelAnswerText = prev.modelAnswerText || '';
        }
      }
      
      return updated;
    });
  };

  const handleOptionChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }],
    }));
  };

  const removeOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  // Handlers for fill type (regex)
  const handleAddRegex = () => {
    setFormData((prev) => ({
      ...prev,
      regexList: [...prev.regexList, ''],
    }));
  };

  const handleUpdateRegex = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      regexList: prev.regexList.map((regex, i) => (i === index ? value : regex)),
    }));
  };

  const handleRemoveRegex = (index) => {
    setFormData((prev) => ({
      ...prev,
      regexList: prev.regexList.filter((_, i) => i !== index),
    }));
  };

  const getMatchState = (fd = formData) => {
    if (fd.matchLeftItems != null && fd.matchRightItems != null) {
      return {
        leftItems: fd.matchLeftItems.length ? fd.matchLeftItems : [''],
        rightItems: fd.matchRightItems.length ? fd.matchRightItems : ['', ''],
        correct: fd.matchCorrect || (fd.matchLeftItems || []).map((_, i) => i),
      };
    }
    const pairs = fd.answerKeyMatch || [{ left: '', right: '' }];
    return {
      leftItems: pairs.map(p => p.left ?? ''),
      rightItems: pairs.length ? [...pairs.map(p => p.right ?? ''), ''] : ['', ''],
      correct: pairs.map((_, i) => i),
    };
  };

  const handleAddMatchLeft = () => {
    const { leftItems, rightItems, correct } = getMatchState();
    setFormData(prev => ({
      ...prev,
      matchLeftItems: [...leftItems, ''],
      matchRightItems: rightItems,
      matchCorrect: [...correct, Math.min(correct[correct.length - 1] ?? 0, rightItems.length - 1)],
    }));
  };
  const handleAddMatchRight = () => {
    const { leftItems, rightItems, correct } = getMatchState();
    setFormData(prev => ({ ...prev, matchLeftItems: leftItems, matchRightItems: [...rightItems, ''], matchCorrect: correct }));
  };
  const handleUpdateMatchLeft = (idx, value) => {
    const { leftItems, rightItems, correct } = getMatchState();
    const next = [...leftItems];
    next[idx] = value;
    setFormData(prev => ({ ...prev, matchLeftItems: next, matchRightItems: rightItems, matchCorrect: correct }));
  };
  const handleUpdateMatchRight = (idx, value) => {
    const { leftItems, rightItems, correct } = getMatchState();
    const next = [...rightItems];
    next[idx] = value;
    setFormData(prev => ({ ...prev, matchLeftItems: leftItems, matchRightItems: next, matchCorrect: correct }));
  };
  const handleUpdateMatchCorrect = (leftIdx, rightIdx) => {
    const { leftItems, rightItems, correct } = getMatchState();
    const next = [...correct];
    next[leftIdx] = typeof rightIdx === 'number' ? rightIdx : parseInt(rightIdx, 10);
    setFormData(prev => ({ ...prev, matchLeftItems: leftItems, matchRightItems: rightItems, matchCorrect: next }));
  };
  const handleRemoveMatchLeft = (idx) => {
    const { leftItems, rightItems, correct } = getMatchState();
    if (leftItems.length <= 1) return;
    const nextLeft = leftItems.filter((_, i) => i !== idx);
    const nextCorrect = correct.filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, matchLeftItems: nextLeft, matchRightItems: rightItems, matchCorrect: nextCorrect }));
  };
  const handleRemoveMatchRight = (idx) => {
    const { leftItems, rightItems, correct } = getMatchState();
    if (rightItems.length <= 1) return;
    const nextRight = rightItems.filter((_, i) => i !== idx);
    const nextCorrect = correct.map(c => {
      if (c === idx) return 0;
      if (c > idx) return Math.min(c - 1, nextRight.length - 1);
      return c;
    });
    setFormData(prev => ({ ...prev, matchLeftItems: leftItems, matchRightItems: nextRight, matchCorrect: nextCorrect }));
  };

  // Handlers for reorder type
  const handleAddReorderItem = () => {
    setFormData((prev) => ({
      ...prev,
      answerKeyReorder: [...prev.answerKeyReorder, ''],
    }));
  };

  const handleUpdateReorderItem = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      answerKeyReorder: prev.answerKeyReorder.map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleRemoveReorderItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      answerKeyReorder: prev.answerKeyReorder.filter((_, i) => i !== index),
    }));
  };

  // Handlers for Interactive Text - Fill-in-the-blanks
  const handleAddInteractiveBlank = () => {
    const nextId = String.fromCharCode(97 + formData.interactiveBlanks.length);
    if (formData.interactiveBlanks.length >= 10) {
      setError('الحد الأقصى للفراغات هو 10');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      interactiveBlanks: [
        ...prev.interactiveBlanks,
        { id: nextId, type: 'textInput', correctAnswers: [], choices: [], hint: '' },
      ],
    }));
  };

  const handleUpdateInteractiveBlank = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      interactiveBlanks: prev.interactiveBlanks.map((blank, i) =>
        i === index ? { ...blank, [field]: value } : blank
      ),
    }));
  };

  const handleRemoveInteractiveBlank = (index) => {
    setFormData((prev) => ({
      ...prev,
      interactiveBlanks: prev.interactiveBlanks.filter((_, i) => i !== index),
    }));
  };

  const handleAddCorrectAnswer = (blankIndex) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        correctAnswers: [...(updated.interactiveBlanks[blankIndex].correctAnswers || []), ''],
      };
      return updated;
    });
  };

  const handleUpdateCorrectAnswer = (blankIndex, answerIndex, value) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      const newAnswers = [...updated.interactiveBlanks[blankIndex].correctAnswers];
      newAnswers[answerIndex] = value;
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        correctAnswers: newAnswers,
      };
      return updated;
    });
  };

  const handleRemoveCorrectAnswer = (blankIndex, answerIndex) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        correctAnswers: updated.interactiveBlanks[blankIndex].correctAnswers.filter((_, i) => i !== answerIndex),
      };
      return updated;
    });
  };

  const handleAddChoice = (blankIndex) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        choices: [...(updated.interactiveBlanks[blankIndex].choices || []), ''],
      };
      return updated;
    });
  };

  const handleUpdateChoice = (blankIndex, choiceIndex, value) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      const newChoices = [...updated.interactiveBlanks[blankIndex].choices];
      newChoices[choiceIndex] = value;
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        choices: newChoices,
      };
      return updated;
    });
  };

  const handleRemoveChoice = (blankIndex, choiceIndex) => {
    setFormData((prev) => {
      const updated = { ...prev, interactiveBlanks: [...prev.interactiveBlanks] };
      updated.interactiveBlanks[blankIndex] = {
        ...updated.interactiveBlanks[blankIndex],
        choices: updated.interactiveBlanks[blankIndex].choices.filter((_, i) => i !== choiceIndex),
      };
      return updated;
    });
  };

  // Handlers for Interactive Text - Reorder
  const handleAddReorderPart = () => {
    setFormData((prev) => ({
      ...prev,
      interactiveReorder: {
        ...prev.interactiveReorder,
        parts: [
          ...prev.interactiveReorder.parts,
          { id: `part_${prev.interactiveReorder.parts.length + 1}`, text: '', order: prev.interactiveReorder.parts.length + 1 },
        ],
      },
    }));
  };

  const handleUpdateReorderPart = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      interactiveReorder: {
        ...prev.interactiveReorder,
        parts: prev.interactiveReorder.parts.map((part, i) =>
          i === index ? { ...part, [field]: value } : part
        ),
      },
    }));
  };

  const handleRemoveReorderPart = (index) => {
    setFormData((prev) => ({
      ...prev,
      interactiveReorder: {
        ...prev.interactiveReorder,
        parts: prev.interactiveReorder.parts.filter((_, i) => i !== index),
      },
    }));
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('الملف يجب أن يكون ملف صوتي');
      return;
    }

    setUploadingAudio(true);
    setError('');

    try {
      const response = await questionsAPI.uploadMedia(file);
      setAudioFile(response.key);
      setAudioPreview(response.url);
      setSuccess('تم رفع الملف الصوتي بنجاح');
    } catch (err) {
      console.error('Error uploading audio:', err);
      setError('حدث خطأ أثناء رفع الملف الصوتي');
    } finally {
      setUploadingAudio(false);
    }
  };

  // رفع الصور لأسئلة Leben in Deutschland
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formData.usageCategory !== 'state_specific' && formData.usageCategory !== 'common') {
      setError('يمكن رفع الصور فقط لأسئلة Leben in Deutschland (Common أو State Specific)');
      return;
    }

    try {
      setUploadingImages(true);
      setError('');

      const uploadedImages = [];
      
      // رفع كل صورة على حدة
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError(`الملف ${file.name} ليس صورة`);
          continue;
        }

        const response = await questionsAPI.uploadMedia(file);
        console.log('📤 Upload response (FULL):', JSON.stringify(response, null, 2));
        console.log('📤 response.url:', response.url);
        console.log('📤 response.key:', response.key);
        console.log('📤 response.location:', response.location);
        console.log('📤 response.fileUrl:', response.fileUrl);

        // استخدام URL من الـ response مباشرة إذا كان موجوداً
        let imageUrl = '';

        // جرب كل الحقول الممكنة للـ URL
        const possibleUrlFields = [response.url, response.location, response.fileUrl, response.imageUrl, response.path];
        const foundUrl = possibleUrlFields.find(u => u && typeof u === 'string');

        if (foundUrl) {
          if (foundUrl.startsWith('http://') || foundUrl.startsWith('https://')) {
            imageUrl = foundUrl;
          } else if (foundUrl.startsWith('/')) {
            imageUrl = `${API_BASE_URL}${foundUrl}`;
          } else {
            imageUrl = `${API_BASE_URL}/${foundUrl}`;
          }
        } else if (response.key) {
          // بناء URL من key - جرب مسارات مختلفة
          // أولاً جرب /media/ بدلاً من /uploads/
          imageUrl = `${API_BASE_URL}/media/${response.key}`;
        }

        console.log('🖼️ Built image URL:', imageUrl);

        // تجربة تحميل الصورة للتأكد من صحة الـ URL
        console.log('🔍 Testing image URL accessibility...');

        // بناء كائن الصورة حسب بنية API
        const imageObject = {
          type: 'image',
          key: response.key,
          mime: response.mime || file.type,
          provider: 's3',
          url: imageUrl,
          description: '' // حقل الوصف - يمكن إضافته لاحقاً
        };

        uploadedImages.push(imageObject);
      }

      // إضافة الصور المرفوعة إلى formData
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedImages]
      }));

      setSuccess(`تم رفع ${uploadedImages.length} صورة بنجاح ✅`);
      
      // إعادة تعيين input
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء رفع الصور'
      );
    } finally {
      setUploadingImages(false);
    }
  };

  // حذف صورة من القائمة
  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setSuccess('تم حذف الصورة');
  };

  // تحديث وصف الصورة
  const handleUpdateImageDescription = (index, description) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => 
        i === index ? { ...img, description } : img
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    // Validation
    if (!formData.prompt.trim()) {
      setError('نص السؤال مطلوب');
      return;
    }

    if (formData.qType === 'mcq' && formData.options.length < 2) {
      setError('يجب إضافة خيارين على الأقل');
      return;
    }

    if (formData.qType === 'mcq' && !formData.options.some((opt) => opt.isCorrect)) {
      setError('يجب تحديد إجابة صحيحة واحدة على الأقل');
      return;
    }

    if (formData.qType === 'match') {
      const lefts = (formData.matchLeftItems || []).map(s => (s && s.trim ? s.trim() : String(s ?? '')).trim());
      const rightItemsFull = (formData.matchRightItems || []).map(s => (s && s.trim ? s.trim() : String(s ?? '')).trim());
      const correct = formData.matchCorrect || [];
      for (let i = 0; i < lefts.length; i++) {
        if (lefts[i] && correct[i] != null) {
          const rightIdx = typeof correct[i] === 'number' ? correct[i] : parseInt(correct[i], 10);
          const rightVal = rightIdx >= 0 && rightItemsFull[rightIdx] != null ? String(rightItemsFull[rightIdx]).trim() : '';
          if (!rightVal) {
            setError(`عنصر اليسار "${(lefts[i] || '').slice(0, 30)}..." يحتاج عنصر يمين غير فارغ. املأ نص اليمين أو اختر عنصراً آخر.`);
            return;
          }
        }
      }
    }

    setLoading(true);

    try {
      // ✅ ALLOWED_QTYPES - القيم المسموحة
      const ALLOWED_QTYPES = new Set([
        'mcq',
        'fill',
        'true_false',
        'match',
        'reorder',
        'listen',
        'free_text',
        'speaking',
        'interactive_text',
      ]);

      // ✅ Normalize qType - يجب أن يكون lowercase وواحد من القيم المسموحة
      const normalizeQType = (qType) => {
        if (!qType) return 'mcq';
        const normalized = String(qType).trim().toLowerCase();
        if (ALLOWED_QTYPES.has(normalized)) {
          return normalized;
        }
        // إذا لم يكن من القيم المسموحة، نعيد mcq كقيمة افتراضية
        console.warn(`Invalid qType: "${qType}", using "mcq" as default`);
        return 'mcq';
      };

      // Normalize provider to lowercase before sending to backend
      const normalizeProvider = (provider) => {
        if (!provider) return 'deutschland-in-leben';
        const providerLower = provider.toLowerCase();
        const providerMap = {
          'goethe': 'goethe',
          'telc': 'telc',
          'télc': 'telc',
          'ösd': 'osd',
          'osd': 'osd',
          'ecl': 'ecl',
          'dtb': 'dtb',
          'dtz': 'dtz',
          'deutschland-in-leben': 'deutschland-in-leben',
          'leben in deutschland': 'deutschland-in-leben',
          'lid': 'deutschland-in-leben',
          'grammatik': 'grammatik',
          'wortschatz': 'wortschatz',
        };
        return providerMap[providerLower] || providerLower;
      };

      const questionData = {
        prompt: formData.prompt.trimStart(), /* الاحتفاظ بالأسطر الفارغة تحت السؤال للطالب */
        qType: normalizeQType(formData.qType), // ✅ Normalize qType
        provider: normalizeProvider(formData.provider),
        level: formData.level,
        tags: formData.tags,
        status: formData.status,
      };

      if (formData.section) {
        questionData.section = formData.section;
      }

      // ✅ استخدام qType بعد normalize
      const normalizedQType = normalizeQType(formData.qType);
      
      // حسب نوع السؤال
      if (normalizedQType === 'mcq') {
        questionData.options = formData.options.map((opt) => ({
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
        }));
      } else if (normalizedQType === 'fill') {
        if (formData.fillExact) {
          questionData.fillExact = formData.fillExact;
        }
        if (formData.regexList.length > 0) {
          questionData.regexList = formData.regexList;
        }
      } else if (normalizedQType === 'true_false') {
        questionData.answerKeyBoolean = formData.answerKeyBoolean;
      } else if (normalizedQType === 'match') {
        const lefts = (formData.matchLeftItems || []).map(s => (s && s.trim ? s.trim() : String(s ?? '')).trim()).filter(Boolean);
        const rightItemsFull = (formData.matchRightItems || []).map(s => (s && s.trim ? s.trim() : String(s ?? '')).trim());
        const correct = formData.matchCorrect || [];
        if (lefts.length && rightItemsFull.length) {
          questionData.answerKeyMatch = lefts
            .map((left, i) => {
              const rightIdx = typeof correct[i] === 'number' ? correct[i] : parseInt(correct[i], 10);
              const right = rightIdx >= 0 && rightItemsFull[rightIdx] != null ? String(rightItemsFull[rightIdx]).trim() : '';
              return right ? [left, right] : null;
            })
            .filter(Boolean);
          questionData.matchRightOptions = rightItemsFull.filter(Boolean);
        } else {
          questionData.answerKeyMatch = (formData.answerKeyMatch || []).map(item =>
            Array.isArray(item) ? [String(item[0] ?? '').trim(), String(item[1] ?? '').trim()] : [String(item.left ?? '').trim(), String(item.right ?? '').trim()]
          ).filter(([l, r]) => l && r);
        }
      } else if (normalizedQType === 'reorder') {
        questionData.answerKeyReorder = formData.answerKeyReorder;
      } else if (normalizedQType === 'interactive_text') {
        // Interactive Text
        const interactiveTextValue = formData.text?.trim();
        if (interactiveTextValue) {
          questionData.interactiveText = interactiveTextValue;
        }
        if (formData.interactiveTextType === 'fill_blanks' && formData.interactiveBlanks.length > 0) {
          questionData.interactiveBlanks = formData.interactiveBlanks.map((blank) => ({
            id: blank.id,
            type: blank.type,
            correctAnswers: blank.correctAnswers.filter(a => a.trim() !== ''),
            ...(blank.type === 'dropdown' && blank.choices ? { choices: blank.choices.filter(c => c.trim() !== '') } : {}),
            ...(blank.hint ? { hint: blank.hint } : {}),
          }));
        } else if (formData.interactiveTextType === 'reorder' && formData.interactiveReorder.parts.length > 0) {
          questionData.interactiveReorder = {
            parts: formData.interactiveReorder.parts.map(part => ({
              id: part.id,
              text: part.text,
              order: part.order,
            })),
          };
        }
      } else if (normalizedQType === 'free_text') {
        if (formData.sampleAnswer) questionData.sampleAnswer = formData.sampleAnswer;
        if (formData.minWords) questionData.minWords = parseInt(formData.minWords) || undefined;
        if (formData.maxWords) questionData.maxWords = parseInt(formData.maxWords) || undefined;
      } else if (normalizedQType === 'speaking') {
        if (formData.modelAnswerText) questionData.modelAnswerText = formData.modelAnswerText;
        if (formData.minSeconds) questionData.minSeconds = parseInt(formData.minSeconds) || undefined;
        if (formData.maxSeconds) questionData.maxSeconds = parseInt(formData.maxSeconds) || undefined;
      }

      // إضافة media إذا كان موجود (صوت)
      if (audioFile) {
        questionData.media = {
          type: 'audio',
          key: audioFile,
          mime: 'audio/mpeg',
        };
      }

      // حفظ usageCategory دائماً
      if (formData.usageCategory) {
        questionData.usageCategory = formData.usageCategory;
      }

      // إضافة بيانات Leben in Deutschland
      if (formData.usageCategory === 'common' || formData.usageCategory === 'state_specific') {
        questionData.provider = 'leben_in_deutschland';
        questionData.mainSkill = 'leben_test';
        questionData.usageCategory = formData.usageCategory;
        questionData.level = formData.level || 'A1';
        
        if (formData.usageCategory === 'common') {
          questionData.tags = ['300-Fragen'];
        } else if (formData.usageCategory === 'state_specific') {
          questionData.state = formData.selectedState;
          questionData.tags = [formData.selectedState];
        }
        
        // إضافة الصور إذا كانت موجودة
        if (formData.images && formData.images.length > 0) {
          questionData.images = formData.images;
          // إذا كانت هناك صورة واحدة، نضيفها كـ media أيضاً
          if (formData.images.length === 1) {
            questionData.media = formData.images[0];
          }
        }
      }

      // ✅ حفظ فقرة القراءة والبطاقات
      if (readingPassage || readingCards.length > 0) {
        questionData.readingPassage = readingPassage || null;
        questionData.readingPassageBgColor = readingPassageBgColor || null;
        questionData.readingCards = readingCards.filter(c => (c.title || '').trim() || (c.content || '').trim());
        questionData.cardsLayout = cardsLayout || 'vertical';
      }

      // ✅ إرسال contentBlocks من النموذج الرئيسي حتى لا تُمسح عند التحديث
      if (contentBlocks.length > 0) {
        const cleanedBlocks = contentBlocks.map((b) => {
          if (b.type === 'cards' && b.cards) {
            return { ...b, cards: b.cards.map(({ _uploadingImage, ...card }) => card) };
          }
          if (b.type === 'audio') {
            const { _audioFile, _audioPreview, _uploading, ...rest } = b;
            return rest;
          }
          return b;
        });
        questionData.contentBlocks = cleanedBlocks;
      }

      console.log('Updating question data:', JSON.stringify(questionData, null, 2));

      const updatedQuestion = await questionsAPI.update(id, questionData);
      console.log('✅ Question updated successfully:', updatedQuestion);
      setSuccess('تم تحديث السؤال بنجاح!');

      if (returnTo) {
        // Navigate back to the sections page after a short delay
        setTimeout(() => navigate(returnTo), 800);
      } else {
        // Reload the question to get the latest data from the backend
        // This ensures the form shows the updated data
        try {
          await loadQuestion();
          console.log('✅ Question reloaded after update');
        } catch (reloadError) {
          console.error('❌ Error reloading question after update:', reloadError);
        }
      }
    } catch (err) {
      console.error('Update question error:', err);
      
      let errorMessage = 'حدث خطأ أثناء تحديث السؤال';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        } else if (errorData.errors) {
          if (Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map(e => 
              typeof e === 'string' ? e : JSON.stringify(e)
            ).join(', ');
          } else {
            errorMessage = Object.entries(errorData.errors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join(' | ');
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          errorMessage = JSON.stringify(errorData, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingQuestion) {
    return (
      <div className="create-question-page">
        <div className="page-header">
          <button onClick={() => navigate(returnTo || '/admin/questions')} className="back-btn">
            ← العودة
          </button>
          <h1>تعديل السؤال</h1>
        </div>
        <div className="create-question-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
            <p>جاري تحميل بيانات السؤال...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ محرر المحتوى التعليمي (سؤال محتوى فقط، أو فتح من صفحة السؤال العادي)
  if (isContentOnly || showContentBlocksEditor) {
    const updateBlock = (idx, updates) => {
      setContentBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...updates } : b));
    };
    const handleSaveContent = async () => {
      setSavingContent(true);
      setError('');
      try {
        const cleanedBlocks = contentBlocks.map(b => {
          if (b.type === 'cards' && b.cards) {
            return { ...b, cards: b.cards.map(({ _uploadingImage, ...card }) => card) };
          }
          if (b.type === 'audio') {
            const { _audioFile, _audioPreview, _uploading, ...rest } = b;
            return rest;
          }
          return b;
        });
        await questionsAPI.update(id, { contentBlocks: cleanedBlocks });
        setSuccess('تم حفظ المحتوى بنجاح');
      } catch (err) {
        setError('فشل حفظ المحتوى: ' + (err.response?.data?.message || err.message));
      } finally {
        setSavingContent(false);
      }
    };
    const handleUploadBlockAudio = async (blockIndex) => {
      const block = contentBlocks[blockIndex];
      if (!block || !block._audioFile) return;
      updateBlock(blockIndex, { _uploading: true });
      try {
        const token = localStorage.getItem('accessToken');
        const fd = new FormData();
        fd.append('file', block._audioFile);
        const res = await axios.post(`${API_BASE_URL}/listeningclips/upload-audio`, fd, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: token ? `Bearer ${token}` : '' },
        });
        if (block._audioPreview) URL.revokeObjectURL(block._audioPreview);
        updateBlock(blockIndex, { audioUrl: res.data.audioUrl, _audioFile: null, _audioPreview: null, _uploading: false });
        setSuccess('تم رفع الصوت بنجاح');
      } catch (err) {
        updateBlock(blockIndex, { _uploading: false });
        setError('فشل رفع الصوت: ' + (err.response?.data?.message || err.message));
      }
    };
    const handleUploadCardImage = async (blockIdx, cardIdx, file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const token = localStorage.getItem('accessToken');
      if (!token) { setError('يرجى تسجيل الدخول أولاً'); return; }
      // Mark uploading
      const markUploading = (val) => {
        setContentBlocks(prev => prev.map((b, i) => {
          if (i !== blockIdx) return b;
          const cards = [...(b.cards || [])];
          cards[cardIdx] = { ...cards[cardIdx], _uploadingImage: val };
          return { ...b, cards };
        }));
      };
      markUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API_BASE_URL}/media/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        setContentBlocks(prev => prev.map((b, i) => {
          if (i !== blockIdx) return b;
          const cards = [...(b.cards || [])];
          cards[cardIdx] = { ...cards[cardIdx], image: { key: res.data.key, url: res.data.url, mime: res.data.mime || file.type }, _uploadingImage: false };
          return { ...b, cards };
        }));
      } catch (err) {
        markUploading(false);
        setError('فشل رفع الصورة: ' + (err.response?.data?.message || err.message));
      }
    };
    const removeCardImage = (blockIdx, cardIdx) => {
      setContentBlocks(prev => prev.map((b, i) => {
        if (i !== blockIdx) return b;
        const cards = [...(b.cards || [])];
        cards[cardIdx] = { ...cards[cardIdx], image: null };
        return { ...b, cards };
      }));
    };
    const addBlock = (type) => {
      setContentBlocks(prev => [...prev, {
        type,
        order: prev.length,
        ...(type === 'paragraph' && { text: '' }),
        ...(type === 'image' && { images: [] }),
        ...(type === 'audio' && { audioUrl: null }),
        ...(type === 'cards' && { cards: [{ title: '', texts: [{ label: '', content: '' }], color: '' }], cardsLayout: 'vertical' }),
      }]);
    };
    const removeBlock = (idx) => {
      setContentBlocks(prev => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })));
    };
    const moveBlock = (idx, dir) => {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= contentBlocks.length) return;
      setContentBlocks(prev => {
        const copy = [...prev];
        [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
        return copy.map((b, i) => ({ ...b, order: i }));
      });
    };

    const BG_PRESETS = [
      { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
      { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
      { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
      { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
      { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
      { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
      { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
    ];

    return (
      <div className="create-question-page">
        <div className="page-header">
          {showContentBlocksEditor ? (
            <button onClick={() => setShowContentBlocksEditor(false)} className="back-btn">← العودة لتعديل السؤال</button>
          ) : (
            <button onClick={() => navigate(returnTo || '/admin/questions')} className="back-btn">← العودة</button>
          )}
          <h1>تعديل المحتوى التعليمي</h1>
        </div>
        <div className="create-question-container">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div style={{ padding: 16, backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: 700, fontSize: 15, color: '#1e40af' }}>بلوكات المحتوى</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => addBlock('paragraph')}
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #fde68a', backgroundColor: '#fffbeb', color: '#92400e', cursor: 'pointer' }}>+ فقرة</button>
                <button type="button" onClick={() => addBlock('audio')}
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #7dd3fc', backgroundColor: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>+ صوت</button>
                <button type="button" onClick={() => addBlock('cards')}
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', color: '#134e4a', cursor: 'pointer' }}>+ بطاقات</button>
              </div>
            </div>

            {contentBlocks.length === 0 && (
              <p style={{ fontSize: 13, color: '#1e40af', textAlign: 'center', padding: 20, backgroundColor: '#dbeafe', borderRadius: 8 }}>
                لا يوجد محتوى. أضف فقرات أو صوت أو بطاقات.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contentBlocks.map((block, bIdx) => (
                <div key={bIdx} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12, backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      {block.type === 'paragraph' ? '📝 فقرة' : block.type === 'image' ? '🖼️ صور' : block.type === 'cards' ? '📋 بطاقات' : block.type === 'audio' ? '🎵 صوت' : block.type} #{bIdx + 1}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => moveBlock(bIdx, -1)} disabled={bIdx === 0}
                        style={{ padding: '2px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: bIdx === 0 ? 'not-allowed' : 'pointer', backgroundColor: 'white', opacity: bIdx === 0 ? 0.4 : 1 }}>▲</button>
                      <button type="button" onClick={() => moveBlock(bIdx, 1)} disabled={bIdx === contentBlocks.length - 1}
                        style={{ padding: '2px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: bIdx === contentBlocks.length - 1 ? 'not-allowed' : 'pointer', backgroundColor: 'white', opacity: bIdx === contentBlocks.length - 1 ? 0.4 : 1 }}>▼</button>
                      <button type="button" onClick={() => removeBlock(bIdx)}
                        style={{ padding: '2px 8px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>حذف</button>
                    </div>
                  </div>

                  {/* Paragraph Block */}
                  {block.type === 'paragraph' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, color: '#555' }}>لون الخلفية:</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {BG_PRESETS.map((c) => (
                            <button key={c.value} type="button" title={c.label}
                              onClick={() => updateBlock(bIdx, { bgColor: c.value })}
                              style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${(block.bgColor || '') === c.value ? '#3b82f6' : c.border}`, backgroundColor: c.bg, cursor: 'pointer', boxShadow: (block.bgColor || '') === c.value ? '0 0 0 2px #93c5fd' : 'none' }} />
                          ))}
                        </div>
                      </div>
                      <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
                        <SimpleHtmlEditor value={block.text || ''} onChange={(html) => updateBlock(bIdx, { text: html })} placeholder="اكتب الفقرة أو الصق من الوورد (المحاذاة وحجم الخط تُحفظ)" dir="ltr" />
                      </Suspense>
                    </div>
                  )}

                  {/* Image Block */}
                  {block.type === 'image' && (
                    <div>
                      {(block.images || []).length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                          {block.images.map((img, imgIdx) => (
                            <img key={imgIdx} src={img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`}
                              alt={img.description || ''} style={{ width: '100%', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                          ))}
                        </div>
                      ) : <p style={{ fontSize: 12, color: '#999' }}>لا توجد صور</p>}
                    </div>
                  )}

                  {/* Audio Block */}
                  {block.type === 'audio' && (
                    <div style={{ padding: 12, backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8 }}>
                      {block.audioUrl ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ color: '#0369a1', fontWeight: 600, fontSize: 13 }}>✅ ملف صوتي</span>
                            <button type="button" onClick={() => updateBlock(bIdx, { audioUrl: null })}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✕ إزالة</button>
                          </div>
                          <audio controls preload="metadata" src={block.audioUrl.startsWith('http') ? block.audioUrl : `${API_BASE_URL}${block.audioUrl}`} style={{ width: '100%' }} />
                        </div>
                      ) : block._audioFile ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12 }}>🎵 {block._audioFile.name}</span>
                            <button type="button" onClick={() => { if (block._audioPreview) URL.revokeObjectURL(block._audioPreview); updateBlock(bIdx, { _audioFile: null, _audioPreview: null }); }}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>✕</button>
                          </div>
                          {block._audioPreview && <audio controls preload="metadata" src={block._audioPreview} style={{ width: '100%', marginBottom: 6 }} />}
                          <button type="button" onClick={() => handleUploadBlockAudio(bIdx)} disabled={block._uploading}
                            style={{ padding: '6px 16px', backgroundColor: block._uploading ? '#94a3b8' : '#0284c7', color: 'white', border: 'none', borderRadius: 6, cursor: block._uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                            {block._uploading ? 'جاري الرفع...' : '⬆️ رفع الصوت'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input type="file" id={`editBlockAudio-${bIdx}`} accept="audio/*"
                            onChange={(e) => { const file = e.target.files[0]; if (file) updateBlock(bIdx, { _audioFile: file, _audioPreview: URL.createObjectURL(file) }); }}
                            style={{ display: 'none' }} />
                          <label htmlFor={`editBlockAudio-${bIdx}`}
                            style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#0284c7', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🎵 اختر ملف صوتي</label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cards Block */}
                  {block.type === 'cards' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>ترتيب العرض:</span>
                        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #16a34a' }}>
                          <button type="button" onClick={() => updateBlock(bIdx, { cardsLayout: 'horizontal' })}
                            style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                              backgroundColor: (block.cardsLayout || 'vertical') === 'horizontal' ? '#16a34a' : '#dcfce7',
                              color: (block.cardsLayout || 'vertical') === 'horizontal' ? '#fff' : '#166534' }}>
                            ▤ أفقي
                          </button>
                          <button type="button" onClick={() => updateBlock(bIdx, { cardsLayout: 'vertical' })}
                            style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderLeft: '1px solid #16a34a', cursor: 'pointer',
                              backgroundColor: (block.cardsLayout || 'vertical') === 'vertical' ? '#16a34a' : '#dcfce7',
                              color: (block.cardsLayout || 'vertical') === 'vertical' ? '#fff' : '#166534' }}>
                            ▦ عمودي (3 في الصف)
                          </button>
                        </div>
                        <button type="button" onClick={() => updateBlock(bIdx, { cards: [...(block.cards || []), { title: '', texts: [{ label: '', content: '' }], color: '' }] })}
                          style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid #16a34a', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer' }}>+ بطاقة</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(block.cards || []).map((card, cIdx) => (
                          <div key={cIdx} style={{ padding: 10, backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#134e4a' }}>بطاقة {cIdx + 1}</span>
                              <button type="button" onClick={() => updateBlock(bIdx, { cards: (block.cards || []).filter((_, i) => i !== cIdx) })}
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, padding: '1px 6px', fontSize: 10, cursor: 'pointer' }}>حذف</button>
                            </div>
                            <Suspense fallback={<div style={{ padding: 4, color: '#999', fontSize: 11 }}>...</div>}>
                              <RichTextEditor value={card.title || ''} onChange={(html) => {
                                const cards = [...(block.cards || [])]; cards[cIdx] = { ...cards[cIdx], title: html };
                                updateBlock(bIdx, { cards });
                              }} placeholder="عنوان البطاقة" />
                            </Suspense>
                            {/* Card Image Upload */}
                            <div style={{ marginTop: 6, marginBottom: 6 }}>
                              {card.image?.url ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img src={card.image.url.startsWith('http') ? card.image.url : `${API_BASE_URL}${card.image.url}`}
                                    alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #99f6e4' }} />
                                  <button type="button" onClick={() => removeCardImage(bIdx, cIdx)}
                                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>
                                    حذف الصورة
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <input type="file" id={`editCardImg-${bIdx}-${cIdx}`} accept="image/*"
                                    onChange={(e) => { const file = e.target.files[0]; if (file) handleUploadCardImage(bIdx, cIdx, file); e.target.value = ''; }}
                                    style={{ display: 'none' }} />
                                  <label htmlFor={`editCardImg-${bIdx}-${cIdx}`}
                                    style={{ display: 'inline-block', padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', color: '#134e4a', cursor: 'pointer' }}>
                                    {card._uploadingImage ? 'جاري الرفع...' : '🖼️ إضافة صورة'}
                                  </label>
                                </div>
                              )}
                            </div>
                            {(card.texts || []).map((entry, tIdx) => (
                              <div key={tIdx} style={{ marginTop: 4 }}>
                                <input type="text" value={entry.label || ''} onChange={(e) => {
                                  const cards = [...(block.cards || [])]; const texts = [...(cards[cIdx].texts || [])];
                                  texts[tIdx] = { ...texts[tIdx], label: e.target.value }; cards[cIdx] = { ...cards[cIdx], texts };
                                  updateBlock(bIdx, { cards });
                                }} placeholder="عنوان فرعي (اختياري)" style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #99f6e4', fontSize: 11, marginBottom: 2, boxSizing: 'border-box' }} />
                                <Suspense fallback={<div style={{ padding: 4, color: '#999', fontSize: 11 }}>...</div>}>
                                  <RichTextEditor value={entry.content || ''} onChange={(html) => {
                                    const cards = [...(block.cards || [])]; const texts = [...(cards[cIdx].texts || [])];
                                    texts[tIdx] = { ...texts[tIdx], content: html }; cards[cIdx] = { ...cards[cIdx], texts };
                                    updateBlock(bIdx, { cards });
                                  }} placeholder="محتوى..." />
                                </Suspense>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button type="button" onClick={handleSaveContent} disabled={savingContent}
                style={{ padding: '10px 24px', backgroundColor: savingContent ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: savingContent ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                {savingContent ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}
              </button>
              <button type="button" onClick={() => navigate(returnTo || '/admin/questions')}
                style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-question-page">
      <div className="page-header">
        <button onClick={() => navigate(returnTo || '/admin/questions')} className="back-btn">
          ← العودة
        </button>
        <h1>تعديل السؤال</h1>
      </div>

      <div className="create-question-container">
        <form onSubmit={handleSubmit} className="question-form">
          {/* Prompt */}
          <div className="form-group">
            <label htmlFor="prompt">
              نص السؤال *
              {!useRichEditor && (
                <button
                  type="button"
                  onClick={() => setUseRichEditor(true)}
                  style={{ marginRight: 8, fontSize: 12, padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#f8fafc', cursor: 'pointer' }}
                  title="التبديل لمحرر غني (مثل الوورد)"
                >
                  محرر غني
                </button>
              )}
              {useRichEditor && (
                <button
                  type="button"
                  onClick={() => setUseRichEditor(false)}
                  style={{ marginRight: 8, fontSize: 12, padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#f8fafc', cursor: 'pointer' }}
                  title="التبديل لنص عادي"
                >
                  نص عادي
                </button>
              )}
            </label>
            {useRichEditor ? (
              <Suspense fallback={<div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, minHeight: 120, background: '#fafafa' }}>جاري تحميل المحرر...</div>}>
                <SimpleHtmlEditor
                  value={formData.prompt}
                  onChange={(html) => setFormData((prev) => ({ ...prev, prompt: html }))}
                  placeholder="أدخل نص السؤال هنا..."
                  dir="ltr"
                />
              </Suspense>
            ) : (
              <textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="أدخل نص السؤال هنا..."
              />
            )}
          </div>

          {/* ✅ المحتوى التعليمي (بلوكات) — عرض وتعديل عند وجود بلوكات */}
          {contentBlocks.length > 0 && !showContentBlocksEditor && (
            <div style={{ padding: 16, backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#1e40af' }}>
                  المحتوى التعليمي ({contentBlocks.filter(b => (b.type || b.blockType) !== 'questions').length} بلوك)
                </label>
                <button
                  type="button"
                  onClick={() => setShowContentBlocksEditor(true)}
                  style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #3b82f6', backgroundColor: '#dbeafe', color: '#1d4ed8', cursor: 'pointer' }}
                >
                  تعديل المحتوى التعليمي
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                فقرات، صور، صوت، بطاقات — تظهر قبل/بعد الأسئلة في الامتحان.
              </p>
            </div>
          )}

          {/* ✅ فقرة القراءة (إذا موجودة) */}
          {(readingPassage || readingCards.length > 0) && (
            <div style={{ padding: 16, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#92400e' }}>
                فقرة القراءة
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
                  placeholder="انسخ نص القراءة هنا من الوورد..."
                  dir="ltr"
                />
              </Suspense>

              {/* بطاقات المعلومات */}
              {readingCards.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>
                      بطاقات المعلومات
                    </label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #f59e0b' }}>
                        <button type="button" onClick={() => setCardsLayout('horizontal')}
                          style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: cardsLayout === 'horizontal' ? '#f59e0b' : '#fef3c7',
                            color: cardsLayout === 'horizontal' ? '#fff' : '#92400e' }}>
                          ▤ أفقي
                        </button>
                        <button type="button" onClick={() => setCardsLayout('vertical')}
                          style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            borderRight: '1px solid #f59e0b',
                            backgroundColor: cardsLayout === 'vertical' ? '#f59e0b' : '#fef3c7',
                            color: cardsLayout === 'vertical' ? '#fff' : '#92400e' }}>
                          ▦ عمودي
                        </button>
                      </div>
                      <button type="button"
                        onClick={() => setReadingCards(prev => [...prev, { title: '', content: '', color: '' }])}
                        style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                          border: '1px solid #f59e0b', backgroundColor: '#fbbf24', color: '#78350f', cursor: 'pointer' }}>
                        + بطاقة جديدة
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: cardsLayout === 'horizontal' ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
                    {readingCards.map((card, idx) => {
                      const CARD_COLORS = [
                        { key: 'teal', bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
                        { key: 'sky', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
                        { key: 'emerald', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
                        { key: 'violet', bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
                        { key: 'rose', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
                        { key: 'amber', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
                        { key: 'orange', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
                        { key: 'indigo', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
                        { key: 'gray', bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
                      ];
                      const sel = CARD_COLORS.find(c => c.key === card.color) || CARD_COLORS[idx % CARD_COLORS.length];
                      return (
                        <div key={idx} style={{ padding: 12, backgroundColor: sel.bg, border: `2px solid ${sel.border}`, borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: sel.text }}>بطاقة {idx + 1}</span>
                            <button type="button"
                              onClick={() => setReadingCards(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                              حذف
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                            {CARD_COLORS.map(c => (
                              <button key={c.key} type="button"
                                onClick={() => setReadingCards(prev => prev.map((cd, i) => i === idx ? { ...cd, color: c.key } : cd))}
                                style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: c.bg,
                                  border: `2px solid ${card.color === c.key ? c.text : c.border}`, cursor: 'pointer',
                                  boxShadow: card.color === c.key ? `0 0 0 2px ${c.border}` : 'none' }} />
                            ))}
                          </div>
                          <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>...</div>}>
                            <SimpleHtmlEditor
                              value={card.title || ''}
                              onChange={(html) => setReadingCards(prev => prev.map((cd, i) => i === idx ? { ...cd, title: html } : cd))}
                              placeholder="عنوان البطاقة"
                              dir="ltr"
                            />
                          </Suspense>
                          <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>...</div>}>
                            <SimpleHtmlEditor
                              value={card.content || ''}
                              onChange={(html) => setReadingCards(prev => prev.map((cd, i) => i === idx ? { ...cd, content: html } : cd))}
                              placeholder="محتوى البطاقة..."
                              dir="ltr"
                            />
                          </Suspense>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Type */}
          {!returnTo && (
          <div className="form-group">
            <label htmlFor="qType">نوع السؤال *</label>
            <select
              id="qType"
              name="qType"
              value={formData.qType}
              onChange={handleInputChange}
              required
            >
              <option value="mcq">اختيار متعدد (MCQ)</option>
              <option value="true_false">صحيح/خطأ (True/False)</option>
              <option value="fill">ملء الفراغ (Fill)</option>
              <option value="match">مطابقة (Match)</option>
              <option value="reorder">ترتيب (Reorder)</option>
              <option value="interactive_text">نص تفاعلي (Interactive Text)</option>
              <option value="free_text">نص حر (Free Text)</option>
              <option value="speaking">تحدث (Speaking)</option>
            </select>
          </div>
          )}

          {/* MCQ Options */}
          {formData.qType === 'mcq' && (
            <div className="form-group">
              <label>الخيارات *</label>
              {formData.options.map((option, index) => (
                <div key={index} className="option-item">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`خيار ${index + 1}`}
                    required
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                    />
                    <span>صحيح</span>
                  </label>
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="remove-btn"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOption} className="add-btn">
                + إضافة خيار
              </button>
            </div>
          )}

          {/* True/False */}
          {formData.qType === 'true_false' && (
            <div className="form-group">
              <label>الإجابة الصحيحة *</label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="answerKeyBoolean"
                  checked={formData.answerKeyBoolean === true}
                  onChange={() => setFormData((prev) => ({ ...prev, answerKeyBoolean: true }))}
                />
                <span>صحيح</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="answerKeyBoolean"
                  checked={formData.answerKeyBoolean === false}
                  onChange={() => setFormData((prev) => ({ ...prev, answerKeyBoolean: false }))}
                />
                <span>خطأ</span>
              </label>
            </div>
          )}

          {/* Fill */}
          {formData.qType === 'fill' && (
            <div className="form-group">
              <label htmlFor="fillExact">الإجابة الصحيحة (fillExact) *</label>
              <input
                type="text"
                id="fillExact"
                name="fillExact"
                value={formData.fillExact}
                onChange={handleInputChange}
                placeholder="مثال: برلين"
                required
              />
              <small>الإجابة الصحيحة المطلوبة (مطابقة تامة)</small>

              <div style={{ marginTop: '16px' }}>
                <label>قائمة Regex (اختياري)</label>
                {formData.regexList.map((regex, index) => (
                  <div key={index} className="option-item">
                    <input
                      type="text"
                      value={regex}
                      onChange={(e) => handleUpdateRegex(index, e.target.value)}
                      placeholder={`Regex ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRegex(index)}
                      className="remove-btn"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddRegex}
                  className="add-btn"
                >
                  + إضافة Regex
                </button>
                <small>قائمة من التعبيرات النمطية للتحقق من الإجابة</small>
              </div>
            </div>
          )}

          {/* Match - مرن: عدد اليسار ≠ عدد اليمين */}
          {formData.qType === 'match' && (() => {
            const { leftItems, rightItems, correct } = getMatchState();
            return (
              <div className="form-group">
                <label>توصيل (Match) — عدد اليسار واليمين مرن *</label>
                <small style={{ display: 'block', marginBottom: 8, color: '#64748b' }}>يمكن أن يكون في اليمين عناصر إضافية (مضللة). حدد التوصيل الصحيح لكل عنصر يسار.</small>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>عناصر اليسار</label>
                    {leftItems.map((val, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <input type="text" value={val} onChange={(e) => handleUpdateMatchLeft(i, e.target.value)} placeholder={`يسار ${i + 1}`} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                        {leftItems.length > 1 && <button type="button" onClick={() => handleRemoveMatchLeft(i)} className="remove-btn">حذف</button>}
                      </div>
                    ))}
                    <button type="button" onClick={handleAddMatchLeft} className="add-btn">+ عنصر يسار</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>عناصر اليمين (صحيح + مضللة)</label>
                    {rightItems.map((val, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <input type="text" value={val} onChange={(e) => handleUpdateMatchRight(i, e.target.value)} placeholder={`يمين ${i + 1}`} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                        {rightItems.length > 1 && <button type="button" onClick={() => handleRemoveMatchRight(i)} className="remove-btn">حذف</button>}
                      </div>
                    ))}
                    <button type="button" onClick={handleAddMatchRight} className="add-btn">+ عنصر يمين</button>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>التوصيل الصحيح (كل يسار → أي يمين؟)</label>
                  {leftItems.map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b', minWidth: 70 }}>يسار {i + 1}</span>
                      <span>→</span>
                      <select value={correct[i] ?? 0} onChange={(e) => handleUpdateMatchCorrect(i, e.target.value)} style={{ flex: 1, maxWidth: 240, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                        {rightItems.map((r, ri) => (
                          <option key={ri} value={ri}>{r.trim() || `(يمين ${ri + 1})`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Reorder Items */}
          {formData.qType === 'reorder' && (
            <div className="form-group">
              <label>ترتيب العناصر الصحيح *</label>
              <small style={{ display: 'block', marginBottom: '8px' }}>
                أدخل العناصر بالترتيب الصحيح (من الأعلى إلى الأسفل)
              </small>
              {formData.answerKeyReorder.map((item, index) => (
                <div key={index} className="option-item">
                  <span style={{ marginRight: '8px', fontWeight: 'bold' }}>{index + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleUpdateReorderItem(index, e.target.value)}
                    placeholder={`العنصر ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveReorderItem(index)}
                    className="remove-btn"
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddReorderItem}
                className="add-btn"
              >
                + إضافة عنصر
              </button>
            </div>
          )}

          {/* Interactive Text */}
          {formData.qType === 'interactive_text' && (
            <div className="form-group">
              <label>نوع المهمة التفاعلية *</label>
              <select
                value={formData.interactiveTextType}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    interactiveTextType: e.target.value,
                    interactiveBlanks: e.target.value === 'fill_blanks' ? prev.interactiveBlanks : [],
                    interactiveReorder: e.target.value === 'reorder' ? prev.interactiveReorder : { parts: [] },
                  }));
                }}
                style={{ marginBottom: '16px' }}
              >
                <option value="fill_blanks">Fill-in-the-blanks (فراغات متعددة)</option>
                <option value="reorder">Reorder (ترتيب الأجزاء)</option>
              </select>

              {/* Fill-in-the-blanks */}
              {formData.interactiveTextType === 'fill_blanks' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    النص مع الفراغات *
                  </label>
                  <small style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>
                    استخدم placeholders مثل {'{{a}}'}, {'{{b}}'}, {'{{c}}'} للفراغات
                  </small>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="مثال: Guten Tag! Ich {{a}} Anna. Ich {{b}} aus {{c}}."
                    rows={5}
                    style={{ marginBottom: '16px', width: '100%' }}
                  />

                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    الفراغات (3-10 فراغات) *
                  </label>
                  {formData.interactiveBlanks.map((blank, blankIndex) => (
                    <div
                      key={blankIndex}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                          فراغ {blank.id.toUpperCase()} ({'{{' + blank.id + '}}'})
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveInteractiveBlank(blankIndex)}
                          className="remove-btn"
                        >
                          حذف
                        </button>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          نوع الإدخال *
                        </label>
                        <select
                          value={blank.type}
                          onChange={(e) => handleUpdateInteractiveBlank(blankIndex, 'type', e.target.value)}
                        >
                          <option value="textInput">Text Input (إدخال نص)</option>
                          <option value="dropdown">Dropdown (قائمة منسدلة)</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          الإجابات الصحيحة * (يمكن إضافة أكثر من إجابة)
                        </label>
                        {blank.correctAnswers.map((answer, answerIndex) => (
                          <div key={answerIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={answer}
                              onChange={(e) => handleUpdateCorrectAnswer(blankIndex, answerIndex, e.target.value)}
                              placeholder="إجابة صحيحة"
                              style={{ flex: 1 }}
                            />
                            {blank.correctAnswers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCorrectAnswer(blankIndex, answerIndex)}
                                className="remove-btn"
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddCorrectAnswer(blankIndex)}
                          className="add-btn"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          + إضافة إجابة صحيحة
                        </button>
                      </div>

                      {blank.type === 'dropdown' && (
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            الخيارات * (حد أدنى 2 خيارات)
                          </label>
                          {(blank.choices || []).map((choice, choiceIndex) => (
                            <div key={choiceIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="text"
                                value={choice}
                                onChange={(e) => handleUpdateChoice(blankIndex, choiceIndex, e.target.value)}
                                placeholder="خيار"
                                style={{ flex: 1 }}
                              />
                              {(blank.choices || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChoice(blankIndex, choiceIndex)}
                                  className="remove-btn"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddChoice(blankIndex)}
                            className="add-btn"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            + إضافة خيار
                          </button>
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          تلميح (اختياري)
                        </label>
                        <input
                          type="text"
                          value={blank.hint || ''}
                          onChange={(e) => handleUpdateInteractiveBlank(blankIndex, 'hint', e.target.value)}
                          placeholder="مثال: Verb: sein oder heißen"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddInteractiveBlank}
                    className="add-btn"
                    disabled={formData.interactiveBlanks.length >= 10}
                  >
                    + إضافة فراغ ({formData.interactiveBlanks.length}/10)
                  </button>
                </div>
              )}

              {/* Interactive Reorder */}
              {formData.interactiveTextType === 'reorder' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    أجزاء النص (2+ أجزاء) *
                  </label>
                  <small style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>
                    أدخل الأجزاء بالترتيب الصحيح (order يبدأ من 1)
                  </small>
                  {formData.interactiveReorder.parts.map((part, index) => (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>جزء {index + 1}</span>
                        <button type="button" onClick={() => handleRemoveReorderPart(index)} className="remove-btn">حذف</button>
                      </div>
                      <input
                        type="text"
                        value={part.text}
                        onChange={(e) => handleUpdateReorderPart(index, 'text', e.target.value)}
                        placeholder="نص الجزء"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />
                      <input
                        type="number"
                        value={part.order}
                        onChange={(e) => handleUpdateReorderPart(index, 'order', parseInt(e.target.value) || 0)}
                        placeholder="الترتيب"
                        style={{ width: '80px' }}
                      />
                    </div>
                  ))}
                  <button type="button" onClick={handleAddReorderPart} className="add-btn">
                    + إضافة جزء
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Free Text */}
          {formData.qType === 'free_text' && (
            <div className="form-group">
              <label htmlFor="sampleAnswer">نموذج الإجابة (Sample Answer)</label>
              <textarea
                id="sampleAnswer"
                name="sampleAnswer"
                value={formData.sampleAnswer}
                onChange={handleInputChange}
                placeholder="أدخل نموذج الإجابة هنا..."
                rows={4}
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="minWords">الحد الأدنى للكلمات</label>
                  <input
                    type="number"
                    id="minWords"
                    name="minWords"
                    value={formData.minWords}
                    onChange={handleInputChange}
                    placeholder="مثال: 50"
                    min="0"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="maxWords">الحد الأقصى للكلمات</label>
                  <input
                    type="number"
                    id="maxWords"
                    name="maxWords"
                    value={formData.maxWords}
                    onChange={handleInputChange}
                    placeholder="مثال: 200"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Speaking */}
          {formData.qType === 'speaking' && (
            <div className="form-group">
              <label htmlFor="modelAnswerText">نموذج الإجابة (Model Answer Text)</label>
              <textarea
                id="modelAnswerText"
                name="modelAnswerText"
                value={formData.modelAnswerText}
                onChange={handleInputChange}
                placeholder="أدخل نموذج الإجابة هنا..."
                rows={4}
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="minSeconds">الحد الأدنى بالثواني</label>
                  <input
                    type="number"
                    id="minSeconds"
                    name="minSeconds"
                    value={formData.minSeconds}
                    onChange={handleInputChange}
                    placeholder="مثال: 30"
                    min="0"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="maxSeconds">الحد الأقصى بالثواني</label>
                  <input
                    type="number"
                    id="maxSeconds"
                    name="maxSeconds"
                    value={formData.maxSeconds}
                    onChange={handleInputChange}
                    placeholder="مثال: 120"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Usage Category */}
          <div className="form-group" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', marginTop: '20px' }}>
            <label htmlFor="usageCategory">🔧 نوع الاستخدام / Question Usage *</label>
            <select
              id="usageCategory"
              name="usageCategory"
              value={formData.usageCategory}
              onChange={handleInputChange}
              required
            >
              <option value="">-- اختر نوع الاستخدام --</option>
              <option value="grammar">Grammar question (قواعد)</option>
              <option value="provider">Provider exam question (Prüfungen)</option>
              <option value="common">Leben in Deutschland - Common (300-Fragen)</option>
              <option value="state_specific">Leben in Deutschland - State Specific (أسئلة الولاية)</option>
            </select>
          </div>

          {/* Grammar Metadata */}
          {formData.usageCategory === 'grammar' && (
            <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                إعدادات سؤال القواعد
              </h3>
              
              <div className="form-group">
                <label htmlFor="level">المستوى / Level *</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>
            </div>
          )}

          {/* Provider Metadata */}
          {formData.usageCategory === 'provider' && (
            <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                🔹 Provider metadata
              </h3>
              
              <div className="form-group">
                <label htmlFor="provider">المعهد / Provider *</label>
                <select
                  id="provider"
                  name="provider"
                  value={formData.provider}
                  onChange={handleInputChange}
                  required
                >
                  {PROVIDERS.filter(p => ['goethe', 'telc', 'osd', 'ecl', 'dtb', 'dtz'].includes(p.value)).map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="level">المستوى / Level *</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                >
                  {getLevelsForProvider(formData.provider, levelNames).map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="section">القسم / Section</label>
                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                >
                  <option value="">-- اختر القسم --</option>
                  <option value="Hören">Hören</option>
                  <option value="Lesen">Lesen</option>
                  <option value="Schreiben">Schreiben</option>
                  <option value="Sprechen">Sprechen</option>
                </select>
              </div>
            </div>
          )}

          {/* Leben Metadata */}
          {(formData.usageCategory === 'common' || formData.usageCategory === 'state_specific') && (
            <div className="form-group" style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', border: '2px solid #fbbf24' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#92400e' }}>
                إعدادات سؤال Leben in Deutschland
              </h3>
              
              <div className="form-group">
                <label htmlFor="level">المستوى / Level *</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>
              
              {formData.usageCategory === 'state_specific' && (
                <div className="form-group">
                  <label htmlFor="selectedState">الولاية / State *</label>
                  <select
                    id="selectedState"
                    name="selectedState"
                    value={formData.selectedState}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- اختر الولاية --</option>
                    {germanStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* رفع الصور لأسئلة Leben in Deutschland (Common و State Specific) */}
              <div className="form-group" style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                <label htmlFor="images" style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  📷 الصور / Images {formData.usageCategory === 'state_specific' ? '(لأسئلة الولاية)' : '(للأسئلة العامة)'}
                </label>
                
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: uploadingImages ? 'not-allowed' : 'pointer',
                      backgroundColor: uploadingImages ? '#f3f4f6' : '#fff'
                    }}
                  />
                </div>
                
                {uploadingImages && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef3c7', 
                    borderRadius: '6px', 
                    color: '#92400e', 
                    fontSize: '14px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⏳</span>
                    <span>جاري رفع الصور...</span>
                  </div>
                )}
                
                {formData.images && formData.images.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      marginBottom: '12px',
                      color: '#374151'
                    }}>
                      ✅ الصور المرفوعة ({formData.images.length}):
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                      gap: '20px' 
                    }}>
                      {formData.images.map((img, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            border: '2px solid #e5e7eb', 
                            borderRadius: '8px', 
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* معاينة الصورة */}
                          <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#f9fafb' }}>
                            {(() => {
                              const imageUrl = getImageUrl(img);
                              console.log(`🖼️ Rendering image ${idx + 1}:`, {
                                image: img,
                                imageUrl: imageUrl,
                                hasUrl: !!imageUrl,
                                hasKey: !!img.key,
                                hasOriginalUrl: !!img.url
                              });
                              
                              if (!imageUrl) {
                                console.warn(`⚠️ No URL for image ${idx + 1}:`, img);
                                return (
                                  <div style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    backgroundColor: '#f3f4f6'
                                  }}>
                                    <span style={{ fontSize: '24px' }}>⚠️</span>
                                    <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '0 8px' }}>
                                      لا يوجد URL للصورة
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '0 8px' }}>
                                      Key: {img.key || 'N/A'}, URL: {img.url || 'N/A'}
                                    </span>
                                  </div>
                                );
                              }
                              
                              return (
                                <img
                                  key={`img-${idx}-${imageUrl}`}
                                  src={imageUrl}
                                  alt={`صورة ${idx + 1}`}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                  onError={(e) => {
                                    console.error('❌ Image failed to load:', {
                                      image: img,
                                      imageUrl: imageUrl,
                                      key: img.key,
                                      originalUrl: img.url,
                                      error: e,
                                      targetSrc: e.target.src
                                    });
                                    e.target.style.display = 'none';
                                    const errorDiv = e.target.nextElementSibling;
                                    if (errorDiv) errorDiv.style.display = 'flex';
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Image loaded successfully:', {
                                      image: img,
                                      imageUrl: imageUrl
                                    });
                                  }}
                                />
                              );
                            })()}
                            <div 
                              style={{ 
                                display: 'none', 
                                width: '100%', 
                                height: '100%', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                backgroundColor: '#f3f4f6',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <span style={{ fontSize: '24px' }}>⚠️</span>
                              <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '0 8px' }}>
                                خطأ في تحميل الصورة
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s',
                                zIndex: 10
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#dc2626';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ef4444';
                                e.target.style.transform = 'scale(1)';
                              }}
                              title="حذف الصورة"
                            >
                              ×
                            </button>
                            <div style={{
                              position: 'absolute',
                              bottom: '0',
                              left: '0',
                              right: '0',
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              padding: '4px 8px',
                              fontSize: '11px',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              Bild {idx + 1}
                            </div>
                          </div>
                          
                          {/* حقل الوصف */}
                          <div style={{ padding: '12px', backgroundColor: '#fafafa' }}>
                            <label 
                              htmlFor={`image-description-${idx}`}
                              style={{ 
                                display: 'block', 
                                marginBottom: '6px', 
                                fontSize: '12px', 
                                fontWeight: '600',
                                color: '#374151'
                              }}
                            >
                              📝 وصف الصورة (اختياري):
                            </label>
                            <textarea
                              id={`image-description-${idx}`}
                              value={img.description || ''}
                              onChange={(e) => handleUpdateImageDescription(idx, e.target.value)}
                              placeholder={`مثال: Bild ${idx + 1}: Das offizielle Wappen von Baden-Württemberg zeigt drei schwarze Löwen auf goldenem Grund.`}
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                minHeight: '60px'
                              }}
                            />
                            {img.description && (
                              <div style={{ 
                                marginTop: '6px', 
                                fontSize: '11px', 
                                color: '#6b7280',
                                fontStyle: 'italic'
                              }}>
                                💡 سيظهر هذا الوصف تحت الصورة عند عرض السؤال
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <small style={{ 
                  display: 'block', 
                  marginTop: '12px', 
                  color: '#6b7280', 
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}>
                  💡 يمكنك رفع عدة صور {formData.usageCategory === 'state_specific' ? 'لأسئلة الولاية (مثل الأعلام، الشعارات، أو أي صور أخرى متعلقة بالولاية)' : 'للأسئلة العامة (300-Fragen)'}
                </small>
              </div>
            </div>
          )}

          {/* Tags - حسب نوع الاستخدام */}
          {formData.usageCategory === 'grammar' && (
            <div className="form-group">
              <label>Tags</label>
              <div className="tags-input">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="أدخل tag واضغط Enter"
                />
                <button type="button" onClick={handleAddTag} className="add-btn">
                  إضافة
                </button>
              </div>
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.usageCategory === 'provider' && (
            <div className="form-group">
              <label>Tags</label>
              <div className="tags-input">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="أدخل tag واضغط Enter"
                />
                <button type="button" onClick={handleAddTag} className="add-btn">
                  إضافة
                </button>
              </div>
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags Display فقط لأسئلة Leben in Deutschland (للعرض فقط) */}
          {(formData.usageCategory === 'common' || formData.usageCategory === 'state_specific') && (
            <div className="form-group" style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                📋 Tags (يتم تحديدها تلقائياً)
              </label>
              <div className="tags-list">
                {formData.tags.length > 0 ? (
                  formData.tags.map((tag, index) => (
                    <span key={index} className="tag" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    {formData.usageCategory === 'common' ? '300-Fragen' : formData.selectedState || 'سيتم إضافة tag تلقائياً عند الحفظ'}
                  </span>
                )}
              </div>
              <small style={{ display: 'block', marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
                💡 Tags يتم تحديدها تلقائياً: {formData.usageCategory === 'common' ? '["300-Fragen"]' : `["${formData.selectedState || 'اسم الولاية'}"]`}
              </small>
            </div>
          )}

          {/* Audio Upload - فقط لأسئلة Provider */}
          {formData.usageCategory === 'provider' && (
            <div className="form-group">
              <label>ملف صوتي (اختياري)</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                disabled={uploadingAudio}
              />
              {audioPreview && (
                <div className="audio-preview">
                  <audio controls src={audioPreview} />
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioPreview(null);
                    }}
                    className="remove-btn"
                  >
                    إزالة الملف
                  </button>
                </div>
              )}
              {uploadingAudio && <p>جاري رفع الملف...</p>}
            </div>
          )}

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status">الحالة *</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              <option value="draft">مسودة (Draft)</option>
              <option value="published">منشور (Published)</option>
              <option value="archived">مؤرشف (Archived)</option>
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              ⚠️ ملاحظة: فقط الأسئلة بحالة "منشور (Published)" ستظهر للطلاب. 
              الأسئلة بحالة "مسودة (Draft)" لن تظهر في صفحة الطلاب.
            </small>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(returnTo || '/admin/questions')}
              className="cancel-btn"
            >
              إلغاء
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditQuestion;

