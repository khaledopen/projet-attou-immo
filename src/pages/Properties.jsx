import React, { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';

const Properties = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const properties = [
    { id: '1', title: 'Appartement de Luxe - Plateau', price: 750000, city: 'Abidjan', address: 'Rue des Banques', status: 'AVAILABLE', ownerName: 'M. Touré' },
    { id: '2', title: 'Villa Bassam avec Piscine', price: 1200000, city: 'Grand-Bassam', address: 'Quartier France', status: 'AVAILABLE', ownerName: 'Mme Koné' },
    { id: '3', title: 'Studio Meublé Cocody', price: 350000, city: 'Abidjan', address: 'Angré 7e Tranche', status: 'RENTED', ownerName: 'Jean Koffi' },
    { id: '4', title: 'Duplex moderne Riviera 3', price: 2000000, city: 'Abidjan', address: 'Riviera 3', status: 'AVAILABLE', ownerName: 'Propriétés Attou' },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Catalogue Immobilier</h2>
          <p className="text-slate-500 font-medium">Gérez et modérez les annonces publiées sur AttouNest.</p>
        </div>
        <button className="flex items-center gap-3 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-primary-200">
          <Plus size={20} strokeWidth={3} />
          Nouveau Bien
        </button>
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
        <button className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm">
          <Filter size={20} />
          Filtres Avancés
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {properties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
};

export default Properties;
