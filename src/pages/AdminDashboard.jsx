import React, { useState, useEffect } from 'react';
import { Users, Home, Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';

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
  const [stats, setStats] = useState({
    locatairesCount: 0,
    proprietairesCount: 0,
    totalUsersCount: 0,
    propertiesCount: 0,
    visitsCount: 0,
    totalRent: 0,
    recentVisits: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Erreur chargement statistiques admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 mb-2">Bonjour, Administrateur</h2>
        <p className="text-slate-500 font-medium">Gérez votre parc immobilier AttouNest en toute sérénité.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard 
          icon={Users} 
          label="Locataires inscrits" 
          value={stats.locatairesCount} 
          trend={stats.locatairesCount > 0 ? `+${stats.locatairesCount}` : '0'} 
          color="bg-primary-600" 
        />
        <StatCard 
          icon={Home} 
          label="Biens en ligne" 
          value={stats.propertiesCount} 
          trend={stats.propertiesCount > 0 ? `+${stats.propertiesCount}` : '0'} 
          color="bg-blue-600" 
        />
        <StatCard 
          icon={Calendar} 
          label="Visites demandées" 
          value={stats.visitsCount} 
          trend={stats.visitsCount > 0 ? `+${stats.visitsCount}` : '0'} 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Loyer mensuel global" 
          value={`${stats.totalRent.toLocaleString()} FCFA`} 
          trend={stats.totalRent > 0 ? '+100%' : '0%'} 
          color="bg-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Demandes de visite récentes</h3>
            <button onClick={() => navigate('/visits')} className="text-primary-600 text-sm font-bold hover:underline">Voir tout</button>
          </div>
          <div className="space-y-4">
            {stats.recentVisits.length === 0 ? (
              <p className="text-slate-400 font-medium text-center py-6">Aucune demande de visite enregistrée.</p>
            ) : (
              stats.recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-600 font-black text-lg border border-slate-100">
                      {visit.locataire?.prenom?.[0] || 'L'}
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-bold">{visit.locataire?.prenom} {visit.locataire?.nom}</h4>
                      <p className="text-slate-400 text-sm">{visit.annonce?.titre} • {visit.annonce?.prix?.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider">
                      {visit.statut}
                    </span>
                    <button onClick={() => navigate('/visits')} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                      Détails
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8">Propriétaires partenaires</h3>
          <div className="space-y-6">
            <div className="flex gap-5 items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                {stats.proprietairesCount}
              </div>
              <div className="flex-1">
                <p className="text-slate-700 text-sm font-bold">Propriétaires enregistrés</p>
                <p className="text-slate-400 text-xs">Partenaires actifs sur la plateforme</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-4">
              <p className="text-slate-500 text-xs leading-relaxed">
                Les propriétaires gèrent actuellement un total de <b>{stats.propertiesCount}</b> biens approuvés et en ligne.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
