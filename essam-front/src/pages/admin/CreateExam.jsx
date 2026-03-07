import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '../../services/examsAPI';
import { useLevels } from '../../hooks/useLevels';
import './CreateExam.css';

// المستويات حسب المزود - provider-specific restrictions still apply
const getLevelsForProvider = (provider, allLevels) => {
  const p = (provider || '').toLowerCase();
  if (p === 'dtz') return [{ value: 'B1', label: 'B1' }];
  if (p === 'dtb') return allLevels
    .filter((l) => l !== 'A1')
    .map((l) => ({ value: l, label: l }));
  return allLevels.map((l) => ({ value: l, label: l }));
};

function CreateExam() {
  const { levelNames } = useLevels();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedState, setSelectedState] = useState('Bayern');

  // Form state
  // ملاحظة: النظام الحالي يعمل بنظام "القواعد العشوائية" (Tags + Quota + Difficulty Distribution)
  // - قسم الولاية: quota = 3, tags = [اسم الولاية] (مثال: ["Bayern"])
  // - قسم الـ 300: quota = 30, tags = ["300-Fragen"] (مطابق للداتابيس)
  // TODO: إضافة إمكانية إنشاء امتحان بالأسئلة اليدوية (manual items) في المستقبل
  const [formData, setFormData] = useState({
    title: '',
    provider: 'LiD', // استخدام LiD بدلاً من Deutschland-in-Leben
    level: 'B1',
    mainSkill: 'leben_test', // ✅ المهارة الرئيسية
    examCategory: 'leben_exam', // ✅ نوع الامتحان (مشتق من provider)
    state: 'Bayern', // إضافة state
    sections: [
      {
        section: 'أسئلة الولاية', // استخدام section بدلاً من name
        quota: 3, // ✅ quota مناسب للولاية
        tags: ['Bayern'], // قيمة افتراضية - يتم تحديثها تلقائياً عند تغيير الولاية
        difficultyDistribution: {
          easy: 0,
          med: 0, // استخدام med بدلاً من medium
          hard: 0,
        },
      },
      {
        section: '300 Fragen Pool', // استخدام section بدلاً من name
        quota: 30, // ✅ quota مناسب للأسئلة الـ 300
        tags: ['300-Fragen'], // ✅ Tag مطابق للداتابيس (حسب Api.md)
        difficultyDistribution: {
          easy: 0,
          med: 0, // استخدام med بدلاً من medium
          hard: 0,
        },
      },
    ],
    randomizeQuestions: true,
    attemptLimit: 0, // 0 = غير محدود
    timeLimitMin: 60,
    status: 'draft',
  });

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

  // تحديث tags القسم الأول تلقائياً عند تغيير الولاية
  useEffect(() => {
    if (formData.provider === 'LiD' && formData.state && formData.sections && formData.sections.length > 0) {
      const firstSection = formData.sections[0];
      // تحديث tags فقط إذا كانت مختلفة
      if (!firstSection.tags || firstSection.tags[0] !== formData.state) {
        console.log('🔄 useEffect: Updating section 0 tags to match state:', formData.state);
        setFormData((prev) => ({
          ...prev,
          sections: prev.sections.map((section, i) => {
            if (i === 0 && prev.provider === 'LiD') {
              return {
                ...section,
                tags: [prev.state],
              };
            }
            return section;
          }),
        }));
      }
    }
  }, [formData.state, formData.provider]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // تحويل provider من Deutschland-in-Leben إلى LiD
      if (name === 'provider' && value === 'Deutschland-in-Leben') {
        updated.provider = 'LiD';
      }

      // إذا تم تغيير provider إلى LiD، التأكد من وجود state وأقسام
      if (name === 'provider' && (value === 'LiD' || value === 'Deutschland-in-Leben')) {
        updated.mainSkill = 'leben_test';
        updated.examCategory = 'leben_exam';
        if (!updated.state) updated.state = 'Bayern';
        // إعادة تعيين الأقسام الافتراضية لـ LiD
        updated.sections = [
          {
            section: 'أسئلة الولاية',
            quota: 3,
            tags: [updated.state || 'Bayern'],
            difficultyDistribution: { easy: 0, med: 0, hard: 0 },
          },
          {
            section: '300 Fragen Pool',
            quota: 30,
            tags: ['300-Fragen'],
            difficultyDistribution: { easy: 0, med: 0, hard: 0 },
          },
        ];
      }

      // ✅ إذا تم تغيير provider إلى غير LiD
      if (name === 'provider' && value !== 'LiD' && value !== 'Deutschland-in-Leben') {
        updated.sections = [];
        // ✅ تعيين examCategory تلقائياً
        if (value === 'Grammatik') {
          updated.examCategory = 'grammar_exam';
          updated.mainSkill = 'mixed';
        } else {
          updated.examCategory = 'provider_exam';
          // الاحتفاظ بـ mainSkill الحالي أو 'mixed' كافتراضي
          if (updated.mainSkill === 'leben_test') {
            updated.mainSkill = 'mixed';
          }
        }
      }

      return updated;
    });
  };

  const handleSectionChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
    }));
  };

  const handleStateChange = (state) => {
    console.log('🔄 Changing state to:', state);
    setSelectedState(state);
    setFormData((prev) => {
      const updated = {
        ...prev,
        state: state,
      };
      
      // تحديث tags للقسم الأول (أسئلة الولاية) تلقائياً
      if (prev.sections && prev.sections.length > 0) {
        updated.sections = prev.sections.map((section, i) => {
          if (i === 0 && prev.provider === 'LiD') {
            // تحديث tags القسم الأول فقط
            console.log('✅ Updating section 0 tags from', section.tags, 'to', [state]);
            return {
              ...section,
              tags: [state],
            };
          }
          return section;
        });
      }
      
      console.log('📝 Updated formData state:', updated.state);
      console.log('📝 Updated section 0 tags:', updated.sections[0]?.tags);
      
      return updated;
    });
  };

  const handleDifficultyChange = (index, difficulty, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index
          ? {
              ...section,
              difficultyDistribution: {
                ...section.difficultyDistribution,
                [difficulty]: parseInt(value) || 0,
              },
            }
          : section
      ),
    }));
  };

  // التحقق من أن مجموع difficultyDistribution يساوي quota
  const validateDifficultyDistribution = (section) => {
    if (!section.difficultyDistribution) return true;
    const { easy = 0, med = 0, hard = 0 } = section.difficultyDistribution;
    const sum = easy + med + hard;
    return sum === 0 || sum === section.quota;
  };

  const handleSectionTagsChange = (index, tags) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, tags } : section
      ),
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title.trim()) {
      setError('عنوان الامتحان مطلوب');
      return;
    }

    // ✅ للـ LiD: يجب أن يكون هناك قسم واحد على الأقل
    // للمزودين الآخرين: يمكن إنشاء امتحان بدون أقسام (sections: [])
    if (formData.provider === 'LiD' && formData.sections.length === 0) {
      setError('يجب إضافة قسم واحد على الأقل لامتحانات LiD');
      return;
    }

    // التحقق من أن كل قسم له tags (فقط إذا كان هناك أقسام)
    for (let i = 0; i < formData.sections.length; i++) {
      const section = formData.sections[i];
      if (!section.tags || section.tags.length === 0) {
        setError(`القسم "${section.section || section.name}" يجب أن يحتوي على tags`);
        return;
      }

      // التحقق من أن مجموع difficultyDistribution يساوي quota
      if (!validateDifficultyDistribution(section)) {
        const { easy = 0, med = 0, hard = 0 } = section.difficultyDistribution || {};
        const sum = easy + med + hard;
        setError(
          `القسم "${section.section || section.name}": مجموع الصعوبة (${sum}) يجب أن يساوي عدد الأسئلة (${section.quota})`
        );
        return;
      }
    }

    setLoading(true);

    try {
      // تنظيف البيانات قبل الإرسال حسب DTO
      const payload = {
        title: formData.title.trim(),
        provider: formData.provider === 'Deutschland-in-Leben' ? 'LiD' : formData.provider,
        level: formData.level,
        mainSkill: formData.mainSkill || 'mixed',
        examCategory: formData.examCategory || 'provider_exam',
        timeLimitMin: Math.max(1, parseInt(String(formData.timeLimitMin), 10) || 1),
        attemptLimit: Number(formData.attemptLimit) || 0,
        randomizeQuestions: !!formData.randomizeQuestions,
        status: formData.status.toLowerCase(),
        // ✅ إرسال sections: [] إذا لم تكن هناك أقسام (للمزودين غير LiD)
        sections: formData.sections.length === 0 ? [] : formData.sections.map((section, index) => {
          const sectionTitle = section.section || section.title || section.name || '';
          const cleanedSection = {
            name: section.name || sectionTitle, // ✅ name مطلوب إجباريًا (مش title)
            skill: section.skill || formData.mainSkill || 'hoeren', // ✅ skill مطلوب
            teilNumber: Number(section.teil ?? section.teilNumber ?? index + 1), // ✅ teilNumber مطلوب
            quota: Number(section.quota) || 0, // ✅ quota مطلوب
          };
          
          // إضافة tags إذا كانت موجودة
          if (section.tags && section.tags.length > 0) {
            cleanedSection.tags = section.tags;
          }
          
          // إضافة difficultyDistribution - جرب medium بدلاً من med
          if (section.difficultyDistribution) {
            const { easy = 0, med = 0, medium = 0, hard = 0 } = section.difficultyDistribution;
            const medValue = med || medium;
            if (easy > 0 || medValue > 0 || hard > 0) {
              cleanedSection.difficultyDistribution = {
                easy: Number(easy) || 0,
                medium: Number(medValue) || 0, // جرب medium كما في Api.md
                hard: Number(hard) || 0,
              };
            }
          }
          
          return cleanedSection;
        }),
      };

      // لا نرسل state في الـ payload - الـ API لا يقبله
      // state يتم استخدامه فقط في tags للقسم الأول

      console.log('Sending exam data:', JSON.stringify(payload, null, 2));

      await examsAPI.create(payload);
      setSuccess('تم إنشاء الامتحان بنجاح!');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSelectedState('Bayern');
        setFormData({
          title: '',
          provider: 'LiD',
          level: 'B1',
          mainSkill: 'leben_test',
          examCategory: 'leben_exam',
          state: 'Bayern',
          sections: [
            {
              section: 'أسئلة الولاية',
              quota: 3,
              tags: ['Bayern'], // قيمة افتراضية
              difficultyDistribution: {
                easy: 0,
                med: 0,
                hard: 0,
              },
            },
            {
              section: '300 Fragen Pool',
              quota: 30,
              tags: ['300-Fragen'],
              difficultyDistribution: {
                easy: 0,
                med: 0,
                hard: 0,
              },
            },
          ],
          randomizeQuestions: true,
          attemptLimit: 0,
          timeLimitMin: 60,
          status: 'draft',
        });
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Create exam error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Full error object:', JSON.stringify(err.response?.data, null, 2));
      
      // عرض رسالة الخطأ التفصيلية
      let errorMessage = 'حدث خطأ أثناء إنشاء الامتحان';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // محاولة استخراج رسالة الخطأ من أماكن مختلفة
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        } else if (errorData.errors) {
          // إذا كان errors مصفوفة
          if (Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map(e => 
              typeof e === 'string' ? e : JSON.stringify(e)
            ).join(', ');
          } else {
            // إذا كان errors object
            errorMessage = Object.entries(errorData.errors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join(' | ');
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          // محاولة عرض كل البيانات
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

  return (
    <div className="create-exam-page">
      <div className="page-header">
        <button onClick={() => navigate('/welcome')} className="back-btn">
          ← العودة للوحة التحكم
        </button>
        <h1>إنشاء امتحان جديد</h1>
      </div>

      <div className="create-exam-container">
        <form onSubmit={handleSubmit} className="exam-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">عنوان الامتحان *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="مثال: Deutschland in Leben - Bayern"
            />
          </div>

          {/* Provider */}
          <div className="form-group">
            <label htmlFor="provider">المزود *</label>
            <select
              id="provider"
              name="provider"
              value={formData.provider}
              onChange={handleInputChange}
              required
            >
              <option value="LiD">LiD (Deutschland-in-Leben)</option>
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

          {/* State - فقط لـ LiD */}
          {formData.provider === 'LiD' && (
            <div className="form-group">
              <label htmlFor="state">الولاية *</label>
              <select
                id="state"
                name="state"
                value={formData.state || 'Bayern'}
                onChange={(e) => {
                  console.log('🔄 State dropdown changed to:', e.target.value);
                  handleStateChange(e.target.value);
                }}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  appearance: 'auto',
                  WebkitAppearance: 'menulist',
                  MozAppearance: 'menulist',
                }}
              >
                {germanStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                اختر الولاية من القائمة المنسدلة. سيتم تحديث tags القسم الأول تلقائياً.
              </small>
            </div>
          )}

          {/* Level */}
          <div className="form-group">
            <label htmlFor="level">المستوى *</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              required
            >
              {getLevelsForProvider(formData.provider, levelNames).map(lvl => (
                <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
              ))}
            </select>
          </div>

          {/* Main Skill - فقط لغير LiD */}
          {formData.provider !== 'LiD' && (
            <div className="form-group">
              <label htmlFor="mainSkill">المهارة الرئيسية (Main Skill) *</label>
              <select
                id="mainSkill"
                name="mainSkill"
                value={formData.mainSkill}
                onChange={handleInputChange}
                required
              >
                <option value="mixed">مختلط (Mixed)</option>
                <option value="hoeren">Hören (استماع)</option>
                <option value="lesen">Lesen (قراءة)</option>
                <option value="schreiben">Schreiben (كتابة)</option>
                <option value="sprechen">Sprechen (محادثة)</option>
                <option value="sprachbausteine">Sprachbausteine (قواعد لغوية)</option>
              </select>
            </div>
          )}

          {/* Sections */}
          <div className="form-group">
            <label>الأقسام {formData.provider === 'LiD' ? '*' : '(اختياري)'}</label>
            {formData.sections.length === 0 && formData.provider !== 'LiD' && (
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                لا توجد أقسام. يمكنك إضافة أقسام لاحقاً من صفحة إدارة الأقسام، أو أضف قسم يدوياً أدناه.
              </p>
            )}
            {formData.sections.map((section, index) => (
              <div key={index} className="section-item">
                <div className="section-header">
                  <h4>القسم {index + 1}</h4>
                  {formData.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          sections: prev.sections.filter((_, i) => i !== index),
                        }));
                      }}
                      className="remove-section-btn"
                    >
                      حذف
                    </button>
                  )}
                </div>

                <div className="section-fields">
                  <div className="field-group">
                    <label>اسم القسم *</label>
                    <input
                      type="text"
                      value={section.section || section.name || ''}
                      onChange={(e) => handleSectionChange(index, 'section', e.target.value)}
                      required
                      placeholder="مثال: أسئلة الولاية"
                    />
                  </div>

                  <div className="field-group">
                    <label>عدد الأسئلة (Quota) *</label>
                    <input
                      type="number"
                      min="1"
                      value={section.quota}
                      onChange={(e) => handleSectionChange(index, 'quota', parseInt(e.target.value))}
                      required
                    />
                  </div>

                  {index === 0 && formData.provider === 'LiD' && (
                    <div className="field-group">
                      <label>Tags *</label>
                      <input
                        type="text"
                        value={section.tags && section.tags.length > 0 ? section.tags.join(', ') : formData.state || 'Bayern'}
                        readOnly
                        className="readonly-input"
                      />
                      <small>أسئلة الولاية: {formData.state || 'Bayern'}</small>
                    </div>
                  )}

                  {index === 1 && formData.provider === 'LiD' && (
                    <div className="field-group">
                      <label>Tags *</label>
                      <input
                        type="text"
                        value={section.tags && section.tags.length > 0 ? section.tags.join(', ') : '300-Fragen'}
                        onChange={(e) => {
                          const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                          handleSectionTagsChange(index, tags);
                        }}
                        placeholder="300-Fragen"
                        readOnly
                        className="readonly-input"
                      />
                      <small>أسئلة الـ 300 العامة (Tag: 300-Fragen)</small>
                    </div>
                  )}

                  {/* Tags for other sections */}
                  {!(index === 0 && formData.provider === 'LiD') && 
                   !(index === 1 && formData.provider === 'LiD') && (
                    <div className="field-group">
                      <label>Tags *</label>
                      <input
                        type="text"
                        value={section.tags ? section.tags.join(', ') : ''}
                        onChange={(e) => {
                          const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                          handleSectionTagsChange(index, tags);
                        }}
                        placeholder="مثال: Hören, Teil-1"
                      />
                      <small>أدخل tags مفصولة بفواصل</small>
                    </div>
                  )}

                  {/* Difficulty Distribution */}
                  <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                    <label>توزيع الصعوبة (اختياري)</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                          سهل (Easy)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.difficultyDistribution?.easy || 0}
                          onChange={(e) => handleDifficultyChange(index, 'easy', e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                          متوسط (Medium)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.difficultyDistribution?.med || section.difficultyDistribution?.medium || 0}
                          onChange={(e) => handleDifficultyChange(index, 'med', e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                          صعب (Hard)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.difficultyDistribution?.hard || 0}
                          onChange={(e) => handleDifficultyChange(index, 'hard', e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </div>
                    </div>
                    <small style={{ display: 'block', marginTop: '4px' }}>
                      عدد الأسئلة لكل مستوى صعوبة (0 = غير محدد)
                    </small>
                  </div>
                </div>
              </div>
            ))}

            {formData.provider === 'LiD' && formData.sections.length < 2 && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    sections: [
                      ...prev.sections,
                      {
                        section: '300 Fragen Pool',
                        quota: 30,
                        tags: ['300-Fragen'],
                        difficultyDistribution: {
                          easy: 0,
                          med: 0,
                          hard: 0,
                        },
                      },
                    ],
                  }));
                }}
                className="add-section-btn"
              >
                + إضافة قسم 300 Fragen
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  sections: [
                    ...prev.sections,
                    {
                      section: '',
                      quota: 1,
                      tags: [],
                      difficultyDistribution: {
                        easy: 0,
                        med: 0,
                        hard: 0,
                      },
                    },
                  ],
                }));
              }}
              className="add-section-btn"
              style={{ marginTop: '8px' }}
            >
              + إضافة قسم جديد
            </button>
          </div>

          {/* Randomize Questions */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="randomizeQuestions"
                checked={formData.randomizeQuestions}
                onChange={handleInputChange}
              />
              <span>خلط ترتيب الأسئلة</span>
            </label>
          </div>

          {/* Attempt Limit */}
          <div className="form-group">
            <label htmlFor="attemptLimit">عدد المحاولات المسموحة</label>
            <input
              type="number"
              id="attemptLimit"
              name="attemptLimit"
              min="0"
              value={formData.attemptLimit}
              onChange={handleInputChange}
            />
            <small>0 = غير محدود</small>
          </div>

          {/* Time Limit */}
          <div className="form-group">
            <label htmlFor="timeLimitMin">الوقت بالدقائق</label>
            <input
              type="number"
              id="timeLimitMin"
              name="timeLimitMin"
              min="1"
              step="1"
              value={formData.timeLimitMin}
              onChange={handleInputChange}
            />
            <small>الحد الأدنى: 1 دقيقة</small>
          </div>

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
              ⚠️ ملاحظة: فقط الامتحانات بحالة "منشور (Published)" ستظهر للطلاب. 
              الامتحانات بحالة "مسودة (Draft)" لن تظهر في صفحة الطلاب.
            </small>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/welcome')}
              className="cancel-btn"
            >
              إلغاء
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ الامتحان'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateExam;

