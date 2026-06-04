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
    const owner = visit.annonce?.proprietaire;
    return (
      visit.locataire?.nom?.toLowerCase().includes(term) ||
      visit.locataire?.prenom?.toLowerCase().includes(term) ||
      visit.annonce?.titre?.toLowerCase().includes(term) ||
      visit.statut?.toLowerCase().includes(term) ||
      owner?.nom?.toLowerCase().includes(term) ||
      owner?.prenom?.toLowerCase().includes(term) ||
      owner?.email?.toLowerCase().includes(term)
    );
  });

  const exportVisitsCSV = () => {
    const headers = ['Locataire', 'Email Locataire', 'Propriétaire', 'Email Propriétaire', 'Bien Demande', 'Loyer', 'Date Visite', 'Statut'];
    const csvContent = [
      headers.join(','),
      ...filteredVisits.map(visit => {
        const tenantName = `"${visit.locataire?.prenom} ${visit.locataire?.nom}"`;
        const tenantEmail = `"${visit.locataire?.email}"`;
        const ownerName = visit.annonce?.proprietaire ? `"${visit.annonce.proprietaire.prenom} ${visit.annonce.proprietaire.nom}"` : '"N/A"';
        const ownerEmail = visit.annonce?.proprietaire ? `"${visit.annonce.proprietaire.email}"` : '"N/A"';
        const propertyTitle = `"${visit.annonce?.titre}"`;
        const price = `"${visit.annonce?.prix} FCFA"`;
        const dateStr = `"${visit.dateProposee ? new Date(visit.dateProposee).toLocaleDateString('fr-FR') : 'Non programmée'}"`;
        const status = `"${visit.statut}"`;
        return [tenantName, tenantEmail, ownerName, ownerEmail, propertyTitle, price, dateStr, status].join(',');
      })
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "visites_attouhome.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportVisitsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHTML = filteredVisits.map(visit => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.locataire?.prenom} ${visit.locataire?.nom}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.locataire?.email}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.annonce?.proprietaire ? `${visit.annonce.proprietaire.prenom} ${visit.annonce.proprietaire.nom}` : 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.annonce?.proprietaire?.email || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.annonce?.titre}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${visit.annonce?.prix?.toLocaleString()} FCFA</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          ${visit.dateProposee ? new Date(visit.dateProposee).toLocaleDateString('fr-FR') : 'Non programmée'}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: ${
          visit.statut === 'ACCEPTEE' ? '#10b981' : visit.statut === 'REFUSEE' ? '#ef4444' : '#f59e0b'
        }">${visit.statut}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>AttouHome - Liste des visites et RDV</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { color: #0284c7; margin-bottom: 5px; }
            p { margin-top: 0; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>AttouHome - Liste des visites et RDV</h2>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} - Total : ${filteredVisits.length} demandes</p>
          <table>
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Email Locataire</th>
                <th>Propriétaire</th>
                <th>Email Propriétaire</th>
                <th>Bien Demandé</th>
                <th>Loyer</th>
                <th>Date de Visite</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-4">
            <Calendar className="text-primary-600" size={40} />
            Visites
          </h2>
          <p className="text-slate-500 font-medium">Consultez l'historique et l'état des demandes de visites proposées.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportVisitsCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
          >
            Exporter Excel (CSV)
          </button>
          <button 
            onClick={exportVisitsPDF}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
          >
            Télécharger PDF
          </button>
          <div className="bg-primary-100 text-primary-700 px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wider">
            {filteredVisits.length} demandes
          </div>
        </div>
      </header>

      <div className="flex gap-5 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par locataire, propriétaire, annonce, statut..." 
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
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Propriétaire</th>
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
                  {visit.annonce?.proprietaire ? (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {visit.annonce.proprietaire.prenom?.[0] || 'P'}
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold text-lg">{visit.annonce.proprietaire.prenom} {visit.annonce.proprietaire.nom}</p>
                        <p className="text-slate-400 text-xs">{visit.annonce.proprietaire.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Non disponible</p>
                  )}
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
