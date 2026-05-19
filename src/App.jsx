import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import Properties from './pages/Properties';
import Moderation from './pages/Moderation';
import Users from './pages/Users';
import Visits from './pages/Visits';

const App = () => {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/moderation" element={<Moderation />} />
            <Route path="/users" element={<Users />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/settings" element={<div className="p-8"><h2 className="text-2xl font-bold">Paramètres</h2></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
