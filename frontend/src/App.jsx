import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import FacultyLayout from './layouts/FacultyLayout';
import StudentLayout from './layouts/StudentLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Faculty pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import DepartmentsPage from './pages/faculty/DepartmentsPage';
import AcademicManagementPage from './pages/faculty/AcademicManagementPage';
import SubjectsPage from './pages/faculty/SubjectsPage';
import StudentsPage from './pages/faculty/StudentsPage';
import AssignmentsPage from './pages/faculty/AssignmentsPage';
import CreateAssignmentPage from './pages/faculty/CreateAssignmentPage';
import SubmissionsPage from './pages/faculty/SubmissionsPage';
import EvaluationReviewPage from './pages/faculty/EvaluationReviewPage';
import ResultsPage from './pages/faculty/ResultsPage';
import AnalyticsPage from './pages/faculty/AnalyticsPage';
import AuditLogPage from './pages/faculty/AuditLogPage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAssignmentsPage from './pages/student/StudentAssignmentsPage';
import AssignmentDetailPage from './pages/student/AssignmentDetailPage';
import StudentResultsPage from './pages/student/StudentResultsPage';
import StudentProfile from './pages/student/StudentProfile';

function FacultyRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="faculty">
      <FacultyLayout>{children}</FacultyLayout>
    </ProtectedRoute>
  );
}

function StudentRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="student">
      <StudentLayout>{children}</StudentLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#f3f4f6',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<Navigate to="/login" replace />} />

          {/* Faculty */}
          <Route path="/faculty/dashboard"       element={<FacultyRoute><FacultyDashboard /></FacultyRoute>} />
          <Route path="/faculty/departments"     element={<FacultyRoute><DepartmentsPage /></FacultyRoute>} />
          <Route path="/faculty/academic-years"  element={<FacultyRoute><AcademicManagementPage /></FacultyRoute>} />
          <Route path="/faculty/years-sections"  element={<FacultyRoute><AcademicManagementPage /></FacultyRoute>} />
          <Route path="/faculty/subjects"        element={<FacultyRoute><SubjectsPage /></FacultyRoute>} />
          <Route path="/faculty/students"        element={<FacultyRoute><StudentsPage /></FacultyRoute>} />
          <Route path="/faculty/assignments"     element={<FacultyRoute><AssignmentsPage /></FacultyRoute>} />
          <Route path="/faculty/assignments/create" element={<FacultyRoute><CreateAssignmentPage /></FacultyRoute>} />
          <Route path="/faculty/assignments/:id" element={<FacultyRoute><AssignmentsPage /></FacultyRoute>} />
          <Route path="/faculty/submissions"     element={<FacultyRoute><SubmissionsPage /></FacultyRoute>} />
          <Route path="/faculty/evaluate/:subId" element={<FacultyRoute><EvaluationReviewPage /></FacultyRoute>} />
          <Route path="/faculty/results"         element={<FacultyRoute><ResultsPage /></FacultyRoute>} />
          <Route path="/faculty/analytics"       element={<FacultyRoute><AnalyticsPage /></FacultyRoute>} />
          <Route path="/faculty/audit-log"       element={<FacultyRoute><AuditLogPage /></FacultyRoute>} />

          {/* Student */}
          <Route path="/student/dashboard"       element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/student/assignments"     element={<StudentRoute><StudentAssignmentsPage /></StudentRoute>} />
          <Route path="/student/assignments/:id" element={<StudentRoute><AssignmentDetailPage /></StudentRoute>} />
          <Route path="/student/results"         element={<StudentRoute><StudentResultsPage /></StudentRoute>} />
          <Route path="/student/profile"         element={<StudentRoute><StudentProfile /></StudentRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
