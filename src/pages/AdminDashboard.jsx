import React from 'react';
import { Users, Home, Calendar, TrendingUp } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary-100 transition-all duration-500 group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1 group-hover:text-slate-500 transition-colors">{label}</h3>
    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
  </div>
);

const AdminDashboard = () => {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 mb-2">Bonjour, Administrateur</h2>
        <p className="text-slate-500 font-medium">Gérez votre parc immobilier AttouNest en toute sérénité.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard 
          icon={Users} 
          label="Locataires actifs" 
          value="1,284" 
          trend="+12%" 
          color="bg-primary-600" 
        />
        <StatCard 
          icon={Home} 
          label="Biens en ligne" 
          value="456" 
          trend="+5%" 
          color="bg-blue-600" 
        />
        <StatCard 
          icon={Calendar} 
          label="Visites ce mois" 
          value="82" 
          trend="+18%" 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Collecte mensuelle" 
          value="12.5M FCFA" 
          trend="+8%" 
          color="bg-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Demandes de visite récentes</h3>
            <button className="text-primary-600 text-sm font-bold hover:underline">Voir tout</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-600 font-black text-lg border border-slate-100">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold">Jean-Marc Koffi {i}</h4>
                    <p className="text-slate-400 text-sm">Appartement F4 • Riviera 3</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider">À confirmer</span>
                  <button className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                    Détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8">Activités Plateforme</h3>
          <div className="space-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-5 relative">
                <div className="w-3 h-3 rounded-full bg-primary-500 mt-1.5 z-10 border-2 border-white shadow-sm shadow-primary-500/50"></div>
                {i !== 4 && <div className="absolute left-[5.5px] top-6 w-[1px] h-12 bg-slate-100"></div>}
                <div className="flex-1">
                  <p className="text-slate-700 text-sm leading-relaxed">Nouveau bien ajouté à <b>Cocody Angré</b> par l'agence Attou.</p>
                  <p className="text-slate-300 text-[11px] font-bold mt-1 uppercase tracking-tighter italic">Il y a {i * 15} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
