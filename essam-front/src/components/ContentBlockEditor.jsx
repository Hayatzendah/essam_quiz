import React, { lazy, Suspense } from 'react';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

const BG_PRESETS = [
  { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
  { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
  { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
  { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
  { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
  { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
];

// Intro Block Editor
export const IntroBlockEditor = ({ block, onUpdate }) => {
  const bgColor = block.data?.bgColor || '';
  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>لون الخلفية:</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {BG_PRESETS.map((c) => (
            <button key={c.value} type="button" title={c.label}
              onClick={() => onUpdate({ ...block, data: { ...block.data, bgColor: c.value } })}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${bgColor === c.value ? '#3b82f6' : c.border}`,
                backgroundColor: c.bg, cursor: 'pointer',
                boxShadow: bgColor === c.value ? '0 0 0 2px #93c5fd' : 'none',
              }} />
          ))}
          <input type="color" value={bgColor || '#fefce8'}
            onChange={(e) => onUpdate({ ...block, data: { ...block.data, bgColor: e.target.value } })}
            title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
        </div>
      </div>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        النص / Text *
      </label>
      <Suspense fallback={<div style={{ padding: 8, color: '#999' }}>جاري التحميل...</div>}>
        <RichTextEditor
          value={block.data?.text || ''}
          onChange={(html) => onUpdate({ ...block, data: { ...block.data, text: html } })}
          placeholder="اكتب النص هنا..."
        />
      </Suspense>
    </div>
  );
};

// Image Block Editor
export const ImageBlockEditor = ({ block, onUpdate }) => {
  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        رابط الصورة / Image URL *
      </label>
      <input
        type="text"
        value={block.data?.url || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, url: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '12px',
        }}
        placeholder="https://example.com/image.jpg"
      />
      
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        النص البديل / Alt Text (اختياري)
      </label>
      <input
        type="text"
        value={block.data?.alt || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, alt: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '12px',
        }}
        placeholder="وصف الصورة"
      />
      
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        العنوان / Caption (اختياري)
      </label>
      <input
        type="text"
        value={block.data?.caption || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, caption: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
        placeholder="عنوان الصورة"
      />
      
      {block.data?.url && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <img
            src={block.data.url}
            alt={block.data.alt || 'Preview'}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

// Table Block Editor
export const TableBlockEditor = ({ block, onUpdate }) => {
  const tableData = block.data || { title: '', headers: [], rows: [] };
  const headers = tableData.headers || [];
  const rows = tableData.rows || [];

  const addColumn = () => {
    const newHeaders = [...headers, ''];
    const newRows = rows.map(row => [...row, '']);
    onUpdate({
      ...block,
      data: { ...tableData, headers: newHeaders, rows: newRows }
    });
  };

  const removeColumn = (colIndex) => {
    if (headers.length > 1) {
      const newHeaders = headers.filter((_, i) => i !== colIndex);
      const newRows = rows.map(row => row.filter((_, i) => i !== colIndex));
      onUpdate({
        ...block,
        data: { ...tableData, headers: newHeaders, rows: newRows }
      });
    }
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill('');
    onUpdate({
      ...block,
      data: { ...tableData, rows: [...rows, newRow] }
    });
  };

  const removeRow = (rowIndex) => {
    if (rows.length > 0) {
      const newRows = rows.filter((_, i) => i !== rowIndex);
      onUpdate({
        ...block,
        data: { ...tableData, rows: newRows }
      });
    }
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const newRows = [...rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    onUpdate({
      ...block,
      data: { ...tableData, rows: newRows }
    });
  };

  const updateHeader = (colIndex, value) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    onUpdate({
      ...block,
      data: { ...tableData, headers: newHeaders }
    });
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <label style={{ fontWeight: '600', fontSize: '14px' }}>عنوان الجدول / Table Title (اختياري)</label>
      </div>
      <input
        type="text"
        value={tableData.title || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...tableData, title: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '16px',
        }}
        placeholder="عنوان الجدول"
      />
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={addColumn}
          style={{
            padding: '6px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          + إضافة عمود
        </button>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          + إضافة صف
        </button>
      </div>

      {headers.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                {headers.map((header, colIndex) => (
                  <th key={colIndex} style={{ padding: '8px', border: '1px solid #e5e7eb', position: 'relative' }}>
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => updateHeader(colIndex, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontWeight: '600',
                        fontSize: '13px',
                      }}
                      placeholder={`عنوان ${colIndex + 1}`}
                    />
                    {headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(colIndex)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          padding: '2px 6px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '13px',
                        }}
                        placeholder="النص..."
                      />
                    </td>
                  ))}
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// YouTube Block Editor
export const YoutubeBlockEditor = ({ block, onUpdate }) => {
  const extractVideoId = (url) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : url;
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        معرف الفيديو / Video ID أو URL *
      </label>
      <input
        type="text"
        value={block.data?.videoId || ''}
        onChange={(e) => {
          const videoId = extractVideoId(e.target.value);
          onUpdate({ ...block, data: { ...block.data, videoId } });
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '12px',
        }}
        placeholder="dQw4w9WgXcQ أو https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      />
      
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        العنوان / Title (اختياري)
      </label>
      <input
        type="text"
        value={block.data?.title || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, title: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
        placeholder="عنوان الفيديو"
      />
      
      {block.data?.videoId && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${block.data.videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: '4px' }}
          />
        </div>
      )}
    </div>
  );
};

// Link Block Editor
export const LinkBlockEditor = ({ block, onUpdate }) => {
  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        رابط / URL *
      </label>
      <input
        type="text"
        value={block.data?.url || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, url: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '12px',
        }}
        placeholder="https://example.com"
      />

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
        النص / Text *
      </label>
      <input
        type="text"
        value={block.data?.text || ''}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
        placeholder="النص الذي سيظهر للرابط"
      />
    </div>
  );
};

// Exercise Block Editor - محرر التمارين
export const ExerciseBlockEditor = ({ block, onUpdate }) => {
  const exerciseData = block.data || {
    title: '',
    questions: [],
    showResultsImmediately: true,
    allowRetry: true
  };
  const questions = exerciseData.questions || [];

  // إضافة سؤال جديد
  const addQuestion = () => {
    const newQuestion = {
      id: `q-${Date.now()}`,
      prompt: '',
      type: 'multiple_choice',
      options: ['', ''],
      correctAnswer: '',
      explanation: ''
    };
    onUpdate({
      ...block,
      data: { ...exerciseData, questions: [...questions, newQuestion] }
    });
  };

  // حذف سؤال
  const removeQuestion = (index) => {
    if (questions.length > 0) {
      const newQuestions = questions.filter((_, i) => i !== index);
      onUpdate({
        ...block,
        data: { ...exerciseData, questions: newQuestions }
      });
    }
  };

  // تحديث سؤال
  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };

    // إذا تغير نوع السؤال، نعيد تهيئة الحقول
    if (field === 'type') {
      if (value === 'multiple_choice') {
        newQuestions[index].options = newQuestions[index].options?.length >= 2
          ? newQuestions[index].options
          : ['', ''];
        delete newQuestions[index].words;
      } else if (value === 'true_false') {
        newQuestions[index].options = ['true', 'false'];
        newQuestions[index].correctAnswer = '';
        delete newQuestions[index].words;
      } else if (value === 'fill_blank') {
        delete newQuestions[index].options;
        delete newQuestions[index].words;
      } else if (value === 'word_order') {
        delete newQuestions[index].options;
        newQuestions[index].words = newQuestions[index].words || [];
        newQuestions[index].correctAnswer = '';
      }
    }

    onUpdate({
      ...block,
      data: { ...exerciseData, questions: newQuestions }
    });
  };

  // إضافة خيار
  const addOption = (questionIndex) => {
    const newQuestions = [...questions];
    const options = newQuestions[questionIndex].options || [];
    newQuestions[questionIndex].options = [...options, ''];
    onUpdate({
      ...block,
      data: { ...exerciseData, questions: newQuestions }
    });
  };

  // حذف خيار
  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    const options = newQuestions[questionIndex].options || [];
    if (options.length > 2) {
      newQuestions[questionIndex].options = options.filter((_, i) => i !== optionIndex);
      // إذا كانت الإجابة الصحيحة هي الخيار المحذوف، نفرغها
      if (newQuestions[questionIndex].correctAnswer === options[optionIndex]) {
        newQuestions[questionIndex].correctAnswer = '';
      }
      onUpdate({
        ...block,
        data: { ...exerciseData, questions: newQuestions }
      });
    }
  };

  // تحديث خيار
  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    const options = [...(newQuestions[questionIndex].options || [])];
    const oldValue = options[optionIndex];
    options[optionIndex] = value;
    newQuestions[questionIndex].options = options;

    // إذا كانت الإجابة الصحيحة هي الخيار القديم، نحدثها
    if (newQuestions[questionIndex].correctAnswer === oldValue) {
      newQuestions[questionIndex].correctAnswer = value;
    }

    onUpdate({
      ...block,
      data: { ...exerciseData, questions: newQuestions }
    });
  };

  // إضافة كلمة لسؤال ترتيب الكلمات
  const addWord = (questionIndex) => {
    const newQuestions = [...questions];
    const words = newQuestions[questionIndex].words || [];
    newQuestions[questionIndex].words = [...words, ''];
    onUpdate({
      ...block,
      data: { ...exerciseData, questions: newQuestions }
    });
  };

  // حذف كلمة من سؤال ترتيب الكلمات
  const removeWord = (questionIndex, wordIndex) => {
    const newQuestions = [...questions];
    const words = newQuestions[questionIndex].words || [];
    if (words.length > 0) {
      newQuestions[questionIndex].words = words.filter((_, i) => i !== wordIndex);
      onUpdate({
        ...block,
        data: { ...exerciseData, questions: newQuestions }
      });
    }
  };

  // تحديث كلمة في سؤال ترتيب الكلمات
  const updateWord = (questionIndex, wordIndex, value) => {
    const newQuestions = [...questions];
    const words = [...(newQuestions[questionIndex].words || [])];
    words[wordIndex] = value;
    newQuestions[questionIndex].words = words;
    onUpdate({
      ...block,
      data: { ...exerciseData, questions: newQuestions }
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#374151',
  };

  const questionTypes = [
    { value: 'multiple_choice', label: 'اختيار من متعدد' },
    { value: 'fill_blank', label: 'ملء الفراغ' },
    { value: 'true_false', label: 'صح أو خطأ' },
    { value: 'word_order', label: 'ترتيب الكلمات' },
  ];

  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      {/* عنوان التمرين */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>عنوان التمرين / Exercise Title (اختياري)</label>
        <input
          type="text"
          value={exerciseData.title || ''}
          onChange={(e) => onUpdate({ ...block, data: { ...exerciseData, title: e.target.value } })}
          style={inputStyle}
          placeholder="مثال: تمرين على تصريف الأفعال"
        />
      </div>

      {/* الأسئلة */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
            الأسئلة ({questions.length})
          </span>
          <button
            type="button"
            onClick={addQuestion}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            + إضافة سؤال
          </button>
        </div>

        {questions.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db',
            color: '#6b7280'
          }}>
            لا توجد أسئلة. اضغط على "إضافة سؤال" للبدء.
          </div>
        )}

        {questions.map((question, qIndex) => (
          <div
            key={question.id || qIndex}
            style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            {/* رأس السؤال */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#4b5563' }}>
                سؤال {qIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                حذف
              </button>
            </div>

            {/* نوع السؤال */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>نوع السؤال *</label>
              <select
                value={question.type || 'multiple_choice'}
                onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {questionTypes.map(qt => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
            </div>

            {/* نص السؤال */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                نص السؤال *
                {question.type === 'fill_blank' && (
                  <span style={{ fontWeight: 'normal', color: '#6b7280', marginRight: '8px' }}>
                    (استخدم ___ للفراغ)
                  </span>
                )}
              </label>
              <textarea
                value={question.prompt || ''}
                onChange={(e) => updateQuestion(qIndex, 'prompt', e.target.value)}
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder={
                  question.type === 'fill_blank'
                    ? 'مثال: Ich ___ Deutsch.'
                    : 'اكتب نص السؤال هنا...'
                }
              />
            </div>

            {/* الخيارات - فقط للاختيار من متعدد */}
            {question.type === 'multiple_choice' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>الخيارات *</label>
                {(question.options || []).map((option, optIndex) => (
                  <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`خيار ${optIndex + 1}`}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input
                        type="radio"
                        name={`correct-${block.id}-${qIndex}`}
                        checked={question.correctAnswer === option && option !== ''}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', option)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: '#059669' }}>صحيح</span>
                    </label>
                    {(question.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, optIndex)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + إضافة خيار
                </button>
              </div>
            )}

            {/* الإجابة الصحيحة - لملء الفراغ */}
            {question.type === 'fill_blank' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>الإجابة الصحيحة *</label>
                <input
                  type="text"
                  value={question.correctAnswer || ''}
                  onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                  style={inputStyle}
                  placeholder="مثال: lerne"
                />
              </div>
            )}

            {/* الإجابة الصحيحة - لصح أو خطأ */}
            {question.type === 'true_false' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>الإجابة الصحيحة *</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`tf-${block.id}-${qIndex}`}
                      checked={question.correctAnswer === 'true'}
                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 'true')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>صحيح (Richtig)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`tf-${block.id}-${qIndex}`}
                      checked={question.correctAnswer === 'false'}
                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 'false')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>خطأ (Falsch)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ترتيب الكلمات */}
            {question.type === 'word_order' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>الكلمات المبعثرة *</label>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  أضف الكلمات التي سيقوم الطالب بترتيبها (بالترتيب العشوائي)
                </p>
                {(question.words || []).map((word, wordIndex) => (
                  <div key={wordIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => updateWord(qIndex, wordIndex, e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`كلمة ${wordIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeWord(qIndex, wordIndex)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addWord(qIndex)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + إضافة كلمة
                </button>

                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>الجملة الصحيحة (بالترتيب الصحيح) *</label>
                  <input
                    type="text"
                    value={question.correctAnswer || ''}
                    onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                    style={inputStyle}
                    placeholder="مثال: Ich lerne Deutsch"
                  />
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    اكتب الجملة كاملة بالترتيب الصحيح (المقارنة تتجاهل حالة الأحرف)
                  </p>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>طريقة الإدخال</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`inputMode-${block.id}-${qIndex}`}
                        checked={(question.inputMode || 'drag') === 'drag'}
                        onChange={() => updateQuestion(qIndex, 'inputMode', 'drag')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>سحب الكلمات (drag)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`inputMode-${block.id}-${qIndex}`}
                        checked={question.inputMode === 'type'}
                        onChange={() => updateQuestion(qIndex, 'inputMode', 'type')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>كتابة الجملة (type)</span>
                    </label>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    {(question.inputMode || 'drag') === 'drag'
                      ? 'الطالب يضغط على الكلمات لترتيبها'
                      : 'الطالب يكتب الجملة بنفسه والكلمات تظهر كمساعدة'}
                  </p>
                </div>
              </div>
            )}

            {/* الشرح */}
            <div>
              <label style={labelStyle}>الشرح (اختياري)</label>
              <textarea
                value={question.explanation || ''}
                onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }}
                placeholder="شرح الإجابة الصحيحة..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* الإعدادات */}
      <div style={{
        padding: '12px',
        backgroundColor: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #bbf7d0'
      }}>
        <span style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: '#166534' }}>
          إعدادات التمرين
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={exerciseData.showResultsImmediately !== false}
              onChange={(e) => onUpdate({
                ...block,
                data: { ...exerciseData, showResultsImmediately: e.target.checked }
              })}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px' }}>إظهار النتيجة فوراً بعد كل سؤال</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={exerciseData.allowRetry !== false}
              onChange={(e) => onUpdate({
                ...block,
                data: { ...exerciseData, allowRetry: e.target.checked }
              })}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px' }}>السماح بإعادة المحاولة</span>
          </label>
        </div>
      </div>
    </div>
  );
};
