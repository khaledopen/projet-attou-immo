import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProperties = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/properties`);
      setProperties(res.data);
    } catch (err) {
      console.error('Erreur chargement catalogue biens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = properties.filter(item => {
    const term = searchQuery.toLowerCase();
    return (
      item.titre?.toLowerCase().includes(term) ||
      item.bien?.adresse?.ville?.toLowerCase().includes(term) ||
      item.bien?.adresse?.rue?.toLowerCase().includes(term) ||
      item.prix?.toString().includes(term)
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Catalogue Immobilier</h2>
          <p className="text-slate-500 font-medium">Gerez et modérez les annonces publiées sur AttouNest.</p>
        </div>
        <div className="bg-primary-100 text-primary-700 px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
          {filteredProperties.length} biens trouvés
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par titre, ville, prix..." 
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold text-lg">Aucun bien ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProperties.map(item => (
            <PropertyCard 
              key={item.id} 
              property={{
                id: item.id,
                title: item.titre,
                price: item.prix,
                city: item.bien?.adresse?.ville || '',
                address: item.bien?.adresse?.rue || '',
                status: item.statut === 'PUBLIEE' ? 'AVAILABLE' : 'RENTED',
                ownerName: item.proprietaire ? `${item.proprietaire.prenom} ${item.proprietaire.nom}` : 'Propriétaire',
                imageUrl: item.photos?.[0]?.url || ''
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Properties;
