import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { AdminAuth } from './pages/AdminAuth';
import { ReportIssue } from './pages/ReportIssue';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const ProtectedRoute = ({ children, requireStaff }: { children: React.ReactNode, requireStaff?: boolean }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="container text-center" style={{ padding: '60px' }}>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (requireStaff && user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/dashboard" />;
  }
  if (!requireStaff && (user.role === 'admin' || user.role === 'staff')) {
    return <Navigate to="/admin" />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-layout">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-login" element={<AdminAuth />} />
              <Route 
                path="/dashboard" 
                element={<ProtectedRoute><CitizenDashboard /></ProtectedRoute>} 
              />
              <Route 
                path="/report" 
                element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} 
              />
              <Route 
                path="/admin" 
                element={<ProtectedRoute requireStaff={true}><AdminDashboard /></ProtectedRoute>} 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
