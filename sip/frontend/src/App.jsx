import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/use-auth.js';
import LoginPage from './pages/LoginPage.jsx';
import DossierPage from './pages/DossierPage.jsx';
import QueueViewPage from './pages/QueueViewPage.jsx';
import FileBrowserPage from './pages/FileBrowserPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="queue" element={<QueueViewPage />} />
        <Route path="dossier" element={<DossierPage />} />
        <Route path="dossier/:id" element={<DossierPage />} />
        <Route path="files" element={<FileBrowserPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="audit" element={<AuditLogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
