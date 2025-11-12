import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { questionsAPI } from '../services/api'

export default function CreateQuestion({ user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    text: '',
    type: 'multiple-choice',
    options: [{ text: '', isCorrect: false }],
    points: 10,
    explanation: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const questionData = {
        ...formData,
        options: formData.type === 'multiple-choice' ? formData.options : undefined,
      }
      await questionsAPI.create(questionData)
      navigate('/questions')
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إنشاء السؤال')
    } finally {
      setLoading(false)
    }
  }

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', isCorrect: false }],
    })
  }

  const updateOption = (index, field, value) => {
    const newOptions = [...formData.options]
    newOptions[index][field] = value
    setFormData({ ...formData, options: newOptions })
  }

  const removeOption = (index) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '30px' }}>إنشاء سؤال جديد</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label>نص السؤال *</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>نوع السؤال *</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value
                setFormData({
                  ...formData,
                  type: newType,
                  options: newType === 'multiple-choice' ? formData.options : [],
                })
              }}
            >
              <option value="multiple-choice">اختيار متعدد</option>
              <option value="true-false">صحيح/خطأ</option>
              <option value="fill-blank">ملء الفراغ</option>
            </select>
          </div>

          <div className="form-group">
            <label>النقاط *</label>
            <input
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
              required
            />
          </div>

          {formData.type === 'multiple-choice' && (
            <div className="form-group">
              <label>الخيارات *</label>
              {formData.options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    placeholder="نص الخيار"
                    style={{ flex: 1 }}
                    required
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(e) => updateOption(index, 'isCorrect', e.target.checked)}
                    />
                    صحيح
                  </label>
                  {formData.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="btn btn-danger"
                      style={{ padding: '8px 16px' }}
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOption} className="btn btn-outline">
                + إضافة خيار
              </button>
            </div>
          )}

          <div className="form-group">
            <label>شرح الإجابة (اختياري)</label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows="2"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء السؤال'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/questions')}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}

