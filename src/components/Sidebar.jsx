import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Home, Users, Calendar, Settings, LogOut, Shield, ChevronRight, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../api/config';
import { io } from 'socket.io-client';

const Sidebar = () => {
  const location = useLocation();
  const [moderationCount, setModerationCount] = useState(0);

  // Récupérer le nombre d'annonces signalées en attente de modération
  const fetchModerationCount = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/moderation/pending`);
      setModerationCount(res.data.length);
    } catch (err) {
      console.error('Erreur chargement compteur modération:', err);
    }
  };

  useEffect(() => {
    fetchModerationCount();

    // Connexion WebSocket pour les mises à jour en temps réel
    const socketURL = BASE_URL.replace('/api', '');
    const socket = io(socketURL);

    // Rafraîchir le compteur lors d'événements liés aux propriétés
    socket.on('property_created', () => fetchModerationCount());
    socket.on('property_updated', () => fetchModerationCount());
    socket.on('property_deleted', () => fetchModerationCount());

    return () => {
      socket.disconnect();
    };
  }, []);

  // Rafraîchir le compteur quand l'admin navigue vers la page Modération
  useEffect(() => {
    if (location.pathname === '/moderation') {
      fetchModerationCount();
    }
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
    { icon: Home, label: 'Catalogue Biens', path: '/properties' },
    { icon: Users, label: 'Utilisateurs', path: '/users' },
    { icon: Calendar, label: 'Visites & RDV', path: '/visits' },
    { icon: Shield, label: 'Modération', path: '/moderation', badge: moderationCount },
    { icon: Settings, label: 'Paramètres', path: '/settings' },
  ];

  return (
    <aside className="h-screen w-72 bg-white text-slate-700 flex flex-col fixed left-0 top-0 border-r border-slate-100 shadow-xl shadow-slate-100/50 z-50 animate-fade-in">
      {/* En-tête / Logo */}
      <div className="p-8 flex items-center gap-4 border-b border-slate-50">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 ring-4 ring-primary-50">
          <Sparkles className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Attou<span className="text-primary-600">Nest</span>
          </h1>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary-600/80">Portail d'administration</p>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-6 py-8 space-y-2 overflow-y-auto">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-4 mb-4">Menu Principal</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const hasBadge = item.badge && item.badge > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/30 translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-primary-600 hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-4">
                <Icon size={22} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-600 transition-colors'} />
                <span className="text-base tracking-wide">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Badge de notification style messagerie */}
                {hasBadge && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '0 5px',
                    lineHeight: 1,
                  }}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={18} className="text-white/80 animate-pulse" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Section Utilisateur / Déconnexion */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4 mb-6 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-black text-lg border border-primary-200">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-slate-900 font-bold text-sm truncate">Admin Principal</h4>
            <p className="text-slate-400 text-xs truncate">admin@attounest.com</p>
          </div>
        </div>

        <button 
          onClick={() => alert('Déconnexion réussie')}
          className="flex items-center justify-center gap-3 px-5 py-4 w-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-300 font-bold border border-transparent hover:border-rose-100 shadow-sm hover:shadow"
        >
          <LogOut size={20} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
