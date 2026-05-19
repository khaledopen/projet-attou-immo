import React, { useState, useEffect } from 'react';
import { Calendar, Search, Clock, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const VisitsPage = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVisits = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/visits`);
      setVisits(res.data);
    } catch (err) {
      console.error('Erreur chargement visites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const filteredVisits = visits.filter(visit => {
    const term = searchQuery.toLowerCase();
    return (
      visit.locataire?.nom?.toLowerCase().includes(term) ||
      visit.locataire?.prenom?.toLowerCase().includes(term) ||
      visit.annonce?.titre?.toLowerCase().includes(term) ||
      visit.statut?.toLowerCase().includes(term)
    );
  });

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
          <h2 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-4">
            <Calendar className="text-primary-600" size={40} />
            Visites
          </h2>
          <p className="text-slate-500 font-medium">Consultez l'historique et l'état des demandes de visites proposées.</p>
        </div>
        <div className="bg-primary-100 text-primary-700 px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
          {filteredVisits.length} demandes
        </div>
      </header>

      <div className="flex gap-5 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par locataire, annonce, statut..." 
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Locataire</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Bien Demandé</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Date de visite</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredVisits.map((visit) => (
              <tr key={visit.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                      {visit.locataire?.prenom?.[0] || 'L'}
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg">{visit.locataire?.prenom} {visit.locataire?.nom}</p>
                      <p className="text-slate-400 text-xs">{visit.locataire?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-slate-800 font-bold">{visit.annonce?.titre}</p>
                  <p className="text-primary-600 font-semibold text-sm">{visit.annonce?.prix?.toLocaleString()} FCFA</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Clock size={16} className="text-slate-400" />
                    <span>
                      {visit.dateProposee 
                        ? new Date(visit.dateProposee).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Non programmée'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    visit.statut === 'ACCEPTEE' 
                      ? 'bg-emerald-50 text-emerald-600'
                      : visit.statut === 'REFUSEE'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {visit.statut === 'ACCEPTEE' ? (
                      <CheckCircle size={14} />
                    ) : visit.statut === 'REFUSEE' ? (
                      <XCircle size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                    {visit.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredVisits.length === 0 && (
          <div className="p-20 text-center">
            <Calendar size={64} className="mx-auto text-slate-100 mb-6" />
            <p className="text-slate-400 font-bold text-lg">Aucune demande de visite trouvée.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitsPage;
