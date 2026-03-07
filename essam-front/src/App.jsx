import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import AuthLayout from './components/AuthLayout';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import CreateQuestion from './pages/admin/CreateQuestion';
import EditQuestion from './pages/admin/EditQuestion';
import CreateExam from './pages/admin/CreateExam';
import EditExam from './pages/admin/EditExam';
import QuestionsList from './pages/admin/QuestionsList';
import ExamsList from './pages/admin/ExamsList';
import ExamSections from './pages/admin/ExamSections';
import LebenInDeutschland from './pages/student/LebenInDeutschland';
import LebenLearningMode from './pages/student/LebenLearningMode';
import ExamPage from './pages/student/ExamPage';
import ExamResults from './pages/student/ExamResults';
import Wortschatz from './pages/Wortschatz';
import WortschatzTopicPage from './pages/WortschatzTopicPage';
import GrammatikPage from './pages/GrammatikPage';
import GrammarTopicPage from './pages/grammar/GrammarTopicPage';
import GrammarExercisePage from './pages/grammar/GrammarExercisePage';
import PruefungenPage from './pages/PruefungenPage';
import ExamDetailsPage from './pages/ExamDetailsPage';
import CreateQuestionWithExam from './pages/admin/CreateQuestionWithExam';
import BulkCreateQuestions from './pages/admin/BulkCreateQuestions';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import StudentsManagement from './pages/admin/StudentsManagement';
import StudentProfile from './pages/admin/StudentProfile';
import GrammarTopicsContent from './pages/admin/GrammarTopicsContent';
import VocabularyTopicsContent from './pages/admin/VocabularyTopicsContent';
import VocabularyWordsContent from './pages/admin/VocabularyWordsContent';
import SchreibenTasksManagement from './pages/admin/SchreibenTasksManagement';
import SchreibenTaskEditor from './pages/admin/SchreibenTaskEditor';
import SchreibenPage from './pages/student/SchreibenPage';
import LevelsManagement from './pages/admin/LevelsManagement';
import DerDieDasPage from './pages/DerDieDasPage';
import DerDieDasQuiz from './pages/DerDieDasQuiz';
import NounsManagement from './pages/admin/NounsManagement';
import GrammatikTrainingManagement from './pages/admin/GrammatikTrainingManagement';
import LesenHoerenPage from './pages/LesenHoerenPage';
import DialogePage from './pages/DialogePage';
import GrammatikTrainingPage from './pages/GrammatikTrainingPage';
import GrammatikTrainingQuiz from './pages/GrammatikTrainingQuiz';
import GrammatikTrainingTopicPage from './pages/GrammatikTrainingTopicPage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  const location = window.location.pathname + window.location.search;

  if (!token) {
    // حفظ الصفحة المطلوبة في query parameter
    return <Navigate to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  return <AuthLayout>{children}</AuthLayout>;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/adminessam-login" />;
  }

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return <Navigate to="/welcome" />;
  }

  return <AuthLayout>{children}</AuthLayout>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/adminessam-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/welcome"
          element={
            <PrivateRoute>
              <Welcome />
            </PrivateRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/welcome" />} />
        <Route
          path="/admin/questions/new"
          element={
            <AdminRoute>
              <CreateQuestion />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions/new-with-exam"
          element={
            <AdminRoute>
              <CreateQuestionWithExam />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions/bulk-create"
          element={
            <AdminRoute>
              <BulkCreateQuestions />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions/:id/edit"
          element={
            <AdminRoute>
              <EditQuestion />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/exams/new"
          element={
            <AdminRoute>
              <CreateExam />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/exams/:id/edit"
          element={
            <AdminRoute>
              <EditExam />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <AdminRoute>
              <QuestionsList />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/exams"
          element={
            <AdminRoute>
              <ExamsList />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/sections"
          element={
            <AdminRoute>
              <ExamSections />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AnalyticsDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <StudentsManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/students/:id"
          element={
            <AdminRoute>
              <StudentProfile />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/grammar-topics"
          element={
            <AdminRoute>
              <GrammarTopicsContent />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/vocabulary/topics"
          element={
            <AdminRoute>
              <VocabularyTopicsContent />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/vocabulary/topics/:topicId/words"
          element={
            <AdminRoute>
              <VocabularyWordsContent />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/levels"
          element={
            <AdminRoute>
              <LevelsManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/derdiedas"
          element={
            <AdminRoute>
              <NounsManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/grammatik-training"
          element={
            <AdminRoute>
              <GrammatikTrainingManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schreiben"
          element={
            <AdminRoute>
              <SchreibenTasksManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schreiben/new"
          element={
            <AdminRoute>
              <SchreibenTaskEditor />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schreiben/:taskId"
          element={
            <AdminRoute>
              <SchreibenTaskEditor />
            </AdminRoute>
          }
        />
        <Route
          path="/student/liden"
          element={
            <PrivateRoute>
              <LebenInDeutschland />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/leben"
          element={
            <PrivateRoute>
              <LebenInDeutschland />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/leben/learn"
          element={
            <PrivateRoute>
              <LebenLearningMode />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/exam/:attemptId"
          element={
            <PrivateRoute>
              <ExamPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/attempt/:attemptId/results"
          element={
            <PrivateRoute>
              <ExamResults />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/schreiben"
          element={
            <PrivateRoute>
              <SchreibenPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/schreiben/:taskId"
          element={
            <PrivateRoute>
              <SchreibenPage />
            </PrivateRoute>
          }
        />
        <Route path="/wortschatz" element={<Wortschatz />} />
        <Route
          path="/wortschatz/:level/:topicSlug"
          element={
            <PrivateRoute>
              <WortschatzTopicPage />
            </PrivateRoute>
          }
        />
        <Route path="/grammatik" element={<GrammatikPage />} />
        <Route
          path="/grammatik/:level/:topicSlug"
          element={
            <PrivateRoute>
              <GrammarTopicPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/grammatik/:level/:topicSlug/exercise"
          element={
            <PrivateRoute>
              <GrammarExercisePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/derdiedas"
          element={
            <PrivateRoute>
              <DerDieDasPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/derdiedas/quiz/:level"
          element={
            <PrivateRoute>
              <DerDieDasQuiz />
            </PrivateRoute>
          }
        />
        <Route path="/pruefungen" element={<PruefungenPage />} />
        <Route path="/pruefungen/exam/:examId" element={<ExamDetailsPage />} />
        <Route path="/lesen-hoeren" element={<LesenHoerenPage />} />
        <Route path="/dialoge" element={<DialogePage />} />
        <Route path="/grammatik-training" element={<GrammatikTrainingPage />} />
        <Route path="/grammatik-training/topic/:examId" element={<GrammatikTrainingTopicPage />} />
        <Route path="/grammatik-training/quiz/topic/:examId" element={<GrammatikTrainingQuiz />} />
        <Route path="/grammatik-training/quiz/:level" element={<GrammatikTrainingQuiz />} />
      </Routes>
    </Router>
  );
}

export default App;

