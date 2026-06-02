import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, UserCheck } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU';
    const confirmMessage = currentStatus === 'SUSPENDU'
      ? "Voulez-vous réactiver ce compte ?"
      : "Voulez-vous suspendre ce compte pour non-respect de la politique de confidentialité ?";
      
    if (!window.confirm(confirmMessage)) return;

    try {
      await axios.patch(`${BASE_URL}/admin/users/${userId}/status`, { statut: newStatus });
      // Update state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, statut: newStatus } : u));
    } catch (err) {
      console.error('Erreur lors de la modification du statut:', err);
      alert('Erreur lors de la modification du statut de l\'utilisateur.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.nom?.toLowerCase().includes(term) ||
      user.prenom?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term)
    );
  });

  const exportUsersCSV = () => {
    const headers = ['Nom complet', 'Email', 'Telephone', 'Role', 'Date Inscription'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => {
        const fullName = `"${user.prenom} ${user.nom}"`;
        const email = `"${user.email}"`;
        const telephone = `"${user.telephone || 'Non spécifié'}"`;
        const role = `"${user.role}"`;
        const dateStr = `"${new Date(user.dateInscription).toLocaleDateString('fr-FR')}"`;
        return [fullName, email, telephone, role, dateStr].join(',');
      })
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "utilisateurs_attouhome.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsersPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHTML = filteredUsers.map(user => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.prenom} ${user.nom}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.email}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.telephone || 'Non spécifié'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.role}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(user.dateInscription).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>AttouHome - Liste des utilisateurs</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { color: #0284c7; margin-bottom: 5px; }
            p { margin-top: 0; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>AttouHome - Liste des utilisateurs</h2>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} - Total : ${filteredUsers.length} inscrits</p>
          <table>
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Date d'inscription</th>
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
            <Users className="text-primary-600" size={40} />
            Utilisateurs
          </h2>
          <p className="text-slate-500 font-medium">Visualisez et gérez tous les comptes inscrits sur la plateforme.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportUsersCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
          >
            Exporter Excel (CSV)
          </button>
          <button 
            onClick={exportUsersPDF}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
          >
            Télécharger PDF
          </button>
          <div className="bg-primary-100 text-primary-700 px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wider">
            {filteredUsers.length} inscrits
          </div>
        </div>
      </header>

      <div className="flex gap-5 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par nom, email, rôle..." 
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
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Utilisateur</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Rôle</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Date d'inscription</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg">
                      {user.prenom?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg">{user.prenom} {user.nom}</p>
                      <p className="text-slate-400 text-xs">{user.email} • {user.telephone || 'Non spécifié'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    user.role === 'ADMIN' 
                      ? 'bg-rose-100 text-rose-700' 
                      : user.role === 'PROPRIETAIRE'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-slate-600 font-medium">
                    {new Date(user.dateInscription).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-4">
                    {user.statut === 'SUSPENDU' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600">
                        <Shield size={14} />
                        Suspendu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">
                        <UserCheck size={14} />
                        Actif
                      </span>
                    )}
                    
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => toggleUserStatus(user.id, user.statut)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          user.statut === 'SUSPENDU'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
                        }`}
                      >
                        {user.statut === 'SUSPENDU' ? 'Activer' : 'Suspendre'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="p-20 text-center">
            <Users size={64} className="mx-auto text-slate-100 mb-6" />
            <p className="text-slate-400 font-bold text-lg">Aucun utilisateur trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
