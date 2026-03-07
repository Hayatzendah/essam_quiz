import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../../services/analyticsAPI';
import { examsAPI } from '../../services/examsAPI';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './AnalyticsDashboard.css';

const COLORS = ['#FFC107', '#ED0D0B', '#000000', '#FF9800', '#F44336'];

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(7); // 7 or 30 days

  // Overview Stats
  const [overview, setOverview] = useState({
    totalExams: 0,
    totalQuestions: 0,
    totalAttempts: 0,
    averageScore: 0,
    totalStudents: 0,
    activeStudents: 0,
    newRegistrations: 0,
  });

  // Student Activity
  const [activityData, setActivityData] = useState([]);

  // Pass Rate
  const [passRateData, setPassRateData] = useState({
    overallPassRate: 0,
    exams: [],
  });
  const [passRateChartData, setPassRateChartData] = useState([
    { name: 'نجح', value: 0 },
    { name: 'رسب', value: 0 },
  ]);

  // Best/Worst Exams
  const [bestExams, setBestExams] = useState([]);
  const [worstExams, setWorstExams] = useState([]);

  // Question Stats
  const [questionStats, setQuestionStats] = useState({
    questionsToImprove: [],
    mostWrongQuestions: [],
  });

  // Define loadData function BEFORE useEffect
  const loadData = async () => {
    try {
      console.log('🔄 Starting to load analytics data...');
      setLoading(true);
      setError('');

      // Load overview
      console.log('📊 Loading overview...');
      const overviewData = await analyticsAPI.getOverview();
      console.log('✅ Overview loaded:', overviewData);
      setOverview(overviewData);

      // Load student activity
      console.log('📈 Loading student activity...');
      const activity = await analyticsAPI.getStudentActivity(timeRange);
      console.log('✅ Activity loaded:', activity);
      // Ensure activity is always an array
      setActivityData(Array.isArray(activity) ? activity : (activity?.data || activity?.items || []));

      // Load pass rate
      console.log('📉 Loading pass rate...');
      const passRate = await analyticsAPI.getPassRate();
      console.log('✅ Pass rate loaded:', passRate);
      setPassRateData(passRate);
      
      // Prepare chart data for pass rate
      const chartData = [
        { name: 'نجح', value: passRate.overallPassRate || 0 },
        { name: 'رسب', value: 100 - (passRate.overallPassRate || 0) },
      ];
      setPassRateChartData(chartData);

      // Load best/worst exams
      console.log('🏆 Loading exam performance...');
      const best = await analyticsAPI.getExamPerformance('best');
      console.log('✅ Best exams loaded:', best);
      setBestExams(Array.isArray(best) ? best : (best?.data || best?.items || []));
      const worst = await analyticsAPI.getExamPerformance('worst');
      console.log('✅ Worst exams loaded:', worst);
      setWorstExams(Array.isArray(worst) ? worst : (worst?.data || worst?.items || []));

      // Load question stats
      console.log('❓ Loading question stats...');
      const questions = await analyticsAPI.getQuestionStats();
      console.log('✅ Questions loaded:', questions);
      // Ensure we always have arrays
      setQuestionStats({
        questionsToImprove: Array.isArray(questions?.questionsToImprove) 
          ? questions.questionsToImprove 
          : [],
        mostWrongQuestions: Array.isArray(questions?.mostWrongQuestions) 
          ? questions.mostWrongQuestions 
          : [],
      });

      console.log('✅ All analytics data loaded successfully!');
    } catch (err) {
      console.error('❌ Error loading analytics:', err);
      console.error('Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        url: err?.config?.url,
      });
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تحميل الإحصائيات');
    } finally {
      setLoading(false);
      console.log('🏁 Loading finished');
    }
  };

  useEffect(() => {
    console.log('🚀 AnalyticsDashboard mounted, loading data...');
    console.log('Time range:', timeRange);
    loadData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-container">
          <p>جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <button 
          onClick={() => navigate('/welcome')} 
          className="back-btn"
          title="العودة للوحة التحكم"
        >
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path 
              stroke="#000000" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
        </button>
        <h1>الإحصائيات</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        {/* Overview Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{overview.totalExams}</h3>
              <p>إجمالي الامتحانات</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{overview.totalQuestions}</h3>
              <p>إجمالي الأسئلة</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{overview.totalStudents}</h3>
              <p>إجمالي الطلاب</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{overview.averageScore?.toFixed(1) || 0}%</h3>
              <p>متوسط العلامات</p>
            </div>
          </div>
        </div>

        {/* Student Activity Chart */}
        <div className="chart-section">
          <div className="section-header">
            <h2>نشاط الطلاب</h2>
            <div className="time-range-selector">
              <button
                className={timeRange === 7 ? 'active' : ''}
                onClick={() => setTimeRange(7)}
              >
                7 أيام
              </button>
              <button
                className={timeRange === 30 ? 'active' : ''}
                onClick={() => setTimeRange(30)}
              >
                30 يوم
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {Array.isArray(activityData) && activityData.length > 0 ? (
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attempts" stroke="#FFC107" name="عدد المحاولات" />
                <Line type="monotone" dataKey="averageScore" stroke="#ED0D0B" name="متوسط العلامات" />
                <Line type="monotone" dataKey="activeStudents" stroke="#000000" name="الطلاب النشطين" />
              </LineChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p>لا توجد بيانات للعرض</p>
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Pass Rate */}
        <div className="chart-section">
          <h2>نسبة النجاح</h2>
          
          {/* Overall Pass Rate */}
          <div className="overall-pass-rate">
            <div className="pass-rate-card">
              <div className="pass-rate-icon">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="pass-rate-info">
                <h3>{passRateData.overallPassRate || 0}%</h3>
                <p>نسبة النجاح العامة</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-row">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                {Array.isArray(passRateChartData) && passRateChartData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={passRateChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={110}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {passRateChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => {
                        const total = passRateChartData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return [`${percentage}%`, name];
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #FFC107',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        padding: '8px 12px',
                      }}
                      labelStyle={{
                        color: '#000',
                        fontWeight: 'bold',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                    />
                  </PieChart>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p>لا توجد بيانات للعرض</p>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                {Array.isArray(passRateChartData) && passRateChartData.length > 0 ? (
                  <BarChart data={passRateChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FFC107" />
                  </BarChart>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p>لا توجد بيانات للعرض</p>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pass Rate Table */}
          {Array.isArray(passRateData.exams) && passRateData.exams.length > 0 && (
            <div className="pass-rate-table-container">
              <h3>نسبة النجاح لكل امتحان</h3>
              <table className="pass-rate-table">
                <thead>
                  <tr>
                    <th>اسم الامتحان</th>
                    <th>عدد المحاولات</th>
                    <th>عدد الناجحين</th>
                    <th>نسبة النجاح</th>
                  </tr>
                </thead>
                <tbody>
                  {passRateData.exams.map((exam, index) => (
                    <tr key={exam.examId || index}>
                      <td>{exam.examName || 'غير محدد'}</td>
                      <td>{exam.attemptsCount || 0}</td>
                      <td>{exam.passedCount || 0}</td>
                      <td>
                        <div className="pass-rate-bar-container">
                          <span className="pass-rate-percentage">{exam.passRate || 0}%</span>
                          <div className="pass-rate-bar">
                            <div
                              className="pass-rate-bar-fill"
                              style={{ width: `${exam.passRate || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best/Worst Exams */}
        <div className="exams-performance">
          <div className="performance-section">
            <h2>أفضل الامتحانات أداءً</h2>
            <div className="exams-list">
              {Array.isArray(bestExams) && bestExams.length > 0 ? (
                bestExams.map((exam, index) => (
                <div key={index} className="exam-item">
                  <div className="exam-rank">#{index + 1}</div>
                  <div className="exam-details">
                    <h4>{exam.title}</h4>
                    <div className="exam-stats">
                      <span>متوسط: {exam.averageScore}%</span>
                      <span>محاولات: {exam.attempts}</span>
                      <span>نسبة نجاح: {exam.passRate}%</span>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <p className="no-data">لا توجد بيانات</p>
              )}
            </div>
          </div>

          <div className="performance-section">
            <h2>أسوأ الامتحانات أداءً</h2>
            <div className="exams-list">
              {Array.isArray(worstExams) && worstExams.length > 0 ? (
                worstExams.map((exam, index) => (
                <div key={index} className="exam-item worst">
                  <div className="exam-rank">#{index + 1}</div>
                  <div className="exam-details">
                    <h4>{exam.title}</h4>
                    <div className="exam-stats">
                      <span>متوسط: {exam.averageScore}%</span>
                      <span>محاولات: {exam.attempts}</span>
                      <span>نسبة نجاح: {exam.passRate}%</span>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <p className="no-data">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>

        {/* Question Stats */}
        <div className="question-stats">
          <div className="stats-column">
            <h3>أكثر الأسئلة إجابة خاطئة</h3>
            <div className="questions-list">
              {Array.isArray(questionStats.mostWrongQuestions) && questionStats.mostWrongQuestions.length > 0 ? (
                questionStats.mostWrongQuestions.slice(0, 5).map((q, index) => (
                  <div key={index} className="question-item">
                    <span className="question-text">{q.prompt || q.text || q.questionText || 'سؤال'}</span>
                    <span className="question-rate">
                      {q.incorrectRate || q.wrongRate || (q.totalAttempts && q.wrongCount 
                        ? ((q.wrongCount / q.totalAttempts) * 100).toFixed(1) 
                        : 0)}% خطأ
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-data">لا توجد بيانات</p>
              )}
            </div>
          </div>

          <div className="stats-column">
            <h3>الأسئلة التي تحتاج تطوير (&lt;40% نجاح)</h3>
            <div className="questions-list">
              {Array.isArray(questionStats.questionsToImprove) && questionStats.questionsToImprove.length > 0 ? (
                questionStats.questionsToImprove.slice(0, 5).map((q, index) => (
                  <div key={index} className="question-item needs-improvement">
                    <span className="question-text">{q.prompt || q.text || q.questionText || 'سؤال'}</span>
                    <span className="question-rate">
                      {q.successRate || (q.totalAttempts && q.correctCount 
                        ? ((q.correctCount / q.totalAttempts) * 100).toFixed(1) 
                        : 0)}% نجاح
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-data">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

