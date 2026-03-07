import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentsAPI } from '../../services/studentsAPI';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './StudentProfile.css';

function StudentProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [examPerformance, setExamPerformance] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [studentLevel, setStudentLevel] = useState('غير محدد');
  const [studentAttemptsCount, setStudentAttemptsCount] = useState(0);

  useEffect(() => {
    if (id) {
      loadStudentData();
    }
  }, [id]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load student info
      const studentData = await studentsAPI.getById(id);
      setStudent(studentData);

      // Load performance
      const perfData = await studentsAPI.getStudentPerformance(id);
      setPerformance(Array.isArray(perfData) ? perfData : []);
      
      // استخراج قائمة الامتحانات من performanceByExam أو exams
      const examsArray = perfData?.performanceByExam || perfData?.exams || [];
      setExamPerformance(Array.isArray(examsArray) ? examsArray : []);
      console.log('examPerformance >>>', examsArray);
      
      // تحديث المستوى وعدد المحاولات من performance data
      setStudentLevel(perfData?.currentLevel || perfData?.level || 'غير محدد');
      setStudentAttemptsCount(
        perfData?.attemptsCount ??
        perfData?.totalAttempts ??
        perfData?.completedAttempts ??
        0
      );
      console.log('performance >>>', perfData);

      // Load attempts
      const attemptsData = await studentsAPI.getStudentAttempts(id);
      setAttempts(Array.isArray(attemptsData?.items) ? attemptsData.items : (Array.isArray(attemptsData) ? attemptsData : []));

      // Load skills
      const skillsData = await studentsAPI.getStudentSkills(id);
      setSkills(Array.isArray(skillsData) ? skillsData : []);
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err?.response?.data?.message || 'حدث خطأ أثناء تحميل بيانات الطالب');
      // تنظيف الداتا في حالة الخطأ
      setPerformance([]);
      setExamPerformance([]);
      setSkills([]);
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'لا يوجد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'غير محدد';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationMinutes = (attempt) => {
    if (!attempt.startedAt || !attempt.submittedAt) return null;
    const start = new Date(attempt.startedAt);
    const end = new Date(attempt.submittedAt);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / 60000); // بالدقايق
  };

  if (loading) {
    return (
      <div className="student-profile">
        <div className="loading-container">
          <p>جاري تحميل بيانات الطالب...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="student-profile">
        <div className="error-message">الطالب غير موجود</div>
      </div>
    );
  }

  return (
    <div className="student-profile">
      <div className="page-header">
        <button onClick={() => navigate('/admin/students')} className="back-btn" style={{ fontSize: '24px', padding: '8px 16px' }}>
          ←
        </button>
        <h1>ملف الطالب</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="profile-content">
        {/* Basic Info */}
        <div className="info-section">
          <h2>المعلومات الأساسية</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>الاسم:</label>
              <span>{student.name || 'غير محدد'}</span>
            </div>
            <div className="info-item">
              <label>الإيميل:</label>
              <span>{student.email || 'غير محدد'}</span>
            </div>
            <div className="info-item">
              <label>المستوى:</label>
              <span>{studentLevel}</span>
            </div>
            <div className="info-item">
              <label>تاريخ التسجيل:</label>
              <span>{formatDate(student.createdAt)}</span>
            </div>
            <div className="info-item">
              <label>آخر نشاط:</label>
              <span>{formatDate(student.lastActivity)}</span>
            </div>
            <div className="info-item">
              <label>عدد المحاولات:</label>
              <span>{studentAttemptsCount}</span>
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="performance-section">
          <h2>أداء الطالب في الامتحانات</h2>
          <div className="table-container">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>الامتحان</th>
                  <th>الدرجة</th>
                  <th>الحالة</th>
                  <th>عدد المحاولات</th>
                  <th>الوقت المستغرق</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {examPerformance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : (
                  examPerformance.map((exam) => (
                    <tr key={exam.examId || exam._id || exam.id}>
                      <td>{exam.examTitle || 'غير محدد'}</td>
                      <td>{exam.score || 0} / {exam.maxScore || exam.totalPoints || 0}</td>
                      <td>
                        <span className={`status-badge ${exam.status === 'completed' ? 'passed' : (exam.passed ? 'passed' : 'failed')}`}>
                          {exam.status === 'completed' ? 'تم التسليم' : (exam.status === 'in-progress' ? 'قيد التقدّم' : (exam.passed ? 'نجح' : 'رسب'))}
                        </span>
                      </td>
                      <td>{exam.attempts || exam.attemptCount || 1}</td>
                      <td>{(() => {
                        const duration = getDurationMinutes(exam);
                        return duration !== null ? `${duration} دقيقة` : 'غير محدد';
                      })()}</td>
                      <td>{formatDate(exam.submittedAt || exam.completedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills Breakdown */}
        {Array.isArray(skills) && skills.length > 0 && (
          <div className="skills-section">
            <h2>تحليل المهارات</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skills}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageScore" fill="#FFC107" name="متوسط الأداء" />
                <Bar dataKey="totalQuestions" fill="#ED0D0B" name="عدد الأسئلة" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attempt History */}
        <div className="attempts-section">
          <h2>سجل المحاولات</h2>
          <div className="attempts-list">
            {!Array.isArray(attempts) || attempts.length === 0 ? (
              <p className="no-data">لا توجد محاولات</p>
            ) : (
              attempts.map((attempt, index) => (
                <div key={index} className="attempt-item">
                  <div className="attempt-header">
                    <h4>{attempt.examTitle || 'امتحان'}</h4>
                    <span className="attempt-date">{formatDate(attempt.submittedAt)}</span>
                  </div>
                  <div className="attempt-details">
                    <span>الدرجة: {attempt.score || 0} / {attempt.totalPoints || 0}</span>
                    <span>الوقت: {(() => {
                      const duration = getDurationMinutes(attempt);
                      return duration !== null ? `${duration} دقيقة` : 'غير محدد';
                    })()}</span>
                    <span>الحالة: {attempt.status === 'submitted' ? 'تم التسليم' : attempt.status}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/student/attempt/${attempt.id || attempt._id}/results`)}
                    className="view-attempt-btn"
                  >
                    عرض التفاصيل
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default StudentProfile;



