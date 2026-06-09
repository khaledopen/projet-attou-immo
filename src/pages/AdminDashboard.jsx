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
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1 group-hover:text-slate-500 transition-colors">{label}</h3>
    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
  </div>
);

const PerformanceChart = ({ data, metric, label, colorHex, gradientId }) => {
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 200;
  const paddingX = 45;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const values = data.map(d => d[metric] || 0);
  const maxVal = Math.max(...values, 5); // S'assurer que l'échelle s'adapte bien même avec des valeurs faibles

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (values[index] / maxVal) * chartHeight;
    return { x, y, val: values[index], label: d.day };
  });

  // Calculer une courbe de Bézier lisse
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + 2 * (curr.x - prev.x) / 3;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  const areaD = pathD ? `${pathD} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z` : "";
  const yTicks = [0, 0.5, 1];

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">{label}</h4>
          <p className="text-3xl font-black text-slate-800">
            {values.reduce((a, b) => a + b, 0)} <span className="text-xs font-medium text-slate-400">cette semaine</span>
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
          7j
        </span>
      </div>

      <div className="relative w-full h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Lignes de grille */}
          {yTicks.map((t, idx) => {
            const y = paddingY + chartHeight - t * chartHeight;
            const valLabel = Math.round(t * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={paddingX + chartWidth}
                  y2={y}
                  stroke="#f8fafc"
                  strokeWidth="1.5"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Zone sous le chemin */}
          {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

          {/* Ligne de chemin */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={colorHex}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Marqueurs */}
          {points.map((p, idx) => (
            <g key={idx} className="group/point">
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#ffffff"
                stroke={colorHex}
                strokeWidth="3"
              />
              {/* Superposition d'info-bulle */}
              <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200">
                <rect
                  x={p.x - 22}
                  y={p.y - 32}
                  width="44"
                  height="22"
                  rx="6"
                  fill="#1e293b"
                />
                <text
                  x={p.x}
                  y={p.y - 17}
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="black"
                  textAnchor="middle"
                >
                  {p.val}
                </text>
              </g>
            </g>
          ))}

          {/* Étiquettes de l'axe X */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 2}
              fill="#94a3b8"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    locatairesCount: 0,
    proprietairesCount: 0,
    totalUsersCount: 0,
    propertiesCount: 0,
    visitsCount: 0,
    totalRent: 0,
    recentVisits: [],
    todayVisitsCount: 0,
    todayUsersCount: 0,
    todayPropertiesCount: 0,
    dailyStats: []
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
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Bonjour, Administrateur</h2>
          <p className="text-slate-500 font-medium">Gérez votre parc immobilier AttouNest en toute sérénité.</p>
        </div>
      </header>

      {/* Cartes des principales statistiques KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <StatCard 
          icon={Users} 
          label="Locataires inscrits" 
          value={stats.locatairesCount} 
          trend={stats.todayUsersCount > 0 ? `+${stats.todayUsersCount} aujourd'hui` : 'Aucun inscrit aujourd\'hui'} 
          color="bg-primary-600" 
        />
        <StatCard 
          icon={Home} 
          label="Biens en ligne" 
          value={stats.propertiesCount} 
          trend={stats.todayPropertiesCount > 0 ? `+${stats.todayPropertiesCount} aujourd'hui` : 'Aucun bien publié aujourd\'hui'} 
          color="bg-blue-600" 
        />
        <StatCard 
          icon={Calendar} 
          label="Visites demandées" 
          value={stats.visitsCount} 
          trend={stats.todayVisitsCount > 0 ? `+${stats.todayVisitsCount} aujourd'hui` : 'Aucune visite aujourd\'hui'} 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Loyer mensuel global" 
          value={`${stats.totalRent.toLocaleString()} FCFA`} 
          trend={stats.totalRent > 0 ? '+100% total' : '0%'} 
          color="bg-indigo-600" 
        />
      </div>

      {/* Section des graphiques de performance */}
      <div className="mb-10">
        <h3 className="text-xl font-extrabold text-slate-800 mb-5">Analyses de performance (7 derniers jours)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PerformanceChart 
            data={stats.dailyStats} 
            metric="users" 
            label="Nouveaux Inscrits" 
            colorHex="#0ea5e9" 
            gradientId="usersGrad" 
          />
          <PerformanceChart 
            data={stats.dailyStats} 
            metric="properties" 
            label="Annonces Actives" 
            colorHex="#2563eb" 
            gradientId="propsGrad" 
          />
          <PerformanceChart 
            data={stats.dailyStats} 
            metric="visits" 
            label="Demandes du Jour" 
            colorHex="#d97706" 
            gradientId="visitsGrad" 
          />
        </div>
      </div>

      {/* Grille des visites récentes & partenaires */}
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
