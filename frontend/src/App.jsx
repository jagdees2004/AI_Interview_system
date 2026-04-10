import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Interview from './pages/Interview';
import Report from './pages/Report';
import History from './pages/History';

import './index.css';

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function AppLayout() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={
          <ProtectedRoute><Setup /></ProtectedRoute>
        } />
        <Route path="/interview/:id" element={
          <ProtectedRoute><Interview /></ProtectedRoute>
        } />
        <Route path="/report/:id" element={
          <ProtectedRoute><Report /></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute><History /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
