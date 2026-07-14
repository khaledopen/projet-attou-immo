import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import Properties from './pages/Properties';
import Moderation from './pages/Moderation';
import Users from './pages/Users';
import Visits from './pages/Visits';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Configurer l'intercepteur de requête pour injecter le token JWT
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Intercepteur de réponse pour forcer la déconnexion sur un code 401 (non autorisé)
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const handleLoginSuccess = (newToken, user) => {
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(user));
    setToken(newToken);
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setAdminUser(null);
  };

  // Si l'administrateur n'est pas connecté, afficher uniquement la page de Login
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar onLogout={handleLogout} user={adminUser} />
        <main className="flex-1 ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/moderation" element={<Moderation />} />
            <Route path="/users" element={<Users />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
