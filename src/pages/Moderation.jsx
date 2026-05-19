import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Eye } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const Moderation = () => {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/moderation/pending`);
      setPendingProperties(res.data);
    } catch (err) {
      console.error('Erreur chargement modération:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    try {
      await axios.post(`${BASE_URL}/admin/properties/${id}/approve`);
      setPendingProperties(prev => prev.filter(p => p.id !== id));
      alert('Le bien a été approuvé et est maintenant en ligne !');
    } catch (err) {
      console.error('Erreur approbation:', err);
      alert('Impossible d\'approuver le bien.');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${BASE_URL}/admin/properties/${id}/reject`);
      setPendingProperties(prev => prev.filter(p => p.id !== id));
      alert('Le bien a été rejeté.');
    } catch (err) {
      console.error('Erreur rejet:', err);
      alert('Impossible de rejeter le bien.');
    }
  };

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
            <Shield className="text-primary-600" size={40} />
            Modération
          </h2>
          <p className="text-slate-500 font-medium">Validez les nouvelles annonces avant leur publication officielle.</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
          {pendingProperties.length} en attente
        </div>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Bien Immobilier</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Propriétaire</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Loyer</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pendingProperties.map((property) => (
              <tr key={property.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400">
                      {property.photos?.[0]?.url ? (
                        <img src={property.photos[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg">{property.titre}</p>
                      <p className="text-slate-400 text-xs italic">
                        {property.bien?.adresse?.ville || 'Côte d\'Ivoire'}, {property.bien?.adresse?.rue || ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-slate-700 font-medium">
                    {property.proprietaire ? `${property.proprietaire.prenom} ${property.proprietaire.nom}` : 'Propriétaire'}
                  </p>
                  <p className="text-slate-400 text-xs">{property.proprietaire?.telephone || ''}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-primary-600 font-black">{property.prix.toLocaleString()} FCFA</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleApprove(property.id)}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-emerald-100"
                      title="Approuver"
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleReject(property.id)}
                      className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-rose-100"
                      title="Rejeter"
                    >
                      <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {pendingProperties.length === 0 && (
          <div className="p-20 text-center">
            <Shield size={64} className="mx-auto text-slate-100 mb-6" />
            <p className="text-slate-400 font-bold text-lg">Aucun bien en attente de modération.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Moderation;
