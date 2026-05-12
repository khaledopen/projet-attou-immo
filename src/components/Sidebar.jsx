import React from 'react';
import { LayoutDashboard, Home, Users, Calendar, Settings, LogOut, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
    { icon: Home, label: 'Propriétés', path: '/properties' },
    { icon: Users, label: 'Utilisateurs', path: '/users' },
    { icon: Calendar, label: 'Visites', path: '/visits' },
    { icon: Shield, label: 'Modération', path: '/moderation' },
    { icon: Settings, label: 'Paramètres', path: '/settings' },
  ];

  return (
    <div className="h-screen w-64 bg-white text-slate-700 flex flex-col fixed left-0 top-0 border-r border-slate-100 shadow-sm">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
          <Home className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Attou<span className="text-primary-600">Nest</span></h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary-50 text-primary-700 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-primary-600'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-500'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300">
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
