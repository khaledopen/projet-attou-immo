import React, { useState } from 'react';
import { Shield, Check, X, Eye } from 'lucide-react';

const Moderation = () => {
  const [pendingProperties, setPendingProperties] = useState([
    { id: '1', title: 'Villa Duplex Cocody', owner: 'M. Touré', price: 1500000, date: 'Il y a 2h' },
    { id: '2', title: 'Studio Meublé Marcory', owner: 'Jean Koffi', price: 400000, date: 'Il y a 5h' },
    { id: '3', title: 'Appartement F4 Riviera 3', owner: 'Mme Koné', price: 850000, date: 'Hier' },
  ]);

  const handleApprove = (id) => {
    setPendingProperties(pendingProperties.filter(p => p.id !== id));
    alert('Le bien a été approuvé et est maintenant en ligne !');
  };

  const handleReject = (id) => {
    setPendingProperties(pendingProperties.filter(p => p.id !== id));
    alert('Le bien a été rejeté.');
  };

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
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg">{property.title}</p>
                      <p className="text-slate-400 text-xs italic">Soumis {property.date}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-slate-700 font-medium">{property.owner}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-primary-600 font-black">{property.price.toLocaleString()} FCFA</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all shadow-sm">
                      <Eye size={20} />
                    </button>
                    <button 
                      onClick={() => handleApprove(property.id)}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-emerald-100"
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleReject(property.id)}
                      className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-rose-100"
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
