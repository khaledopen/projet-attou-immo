import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Filter, ChevronDown } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const STATUS_OPTIONS = [
  { key: 'TOUS', label: 'Tous les statuts', icon: '📋', dotColor: '#64748b' },
  { key: 'PUBLIEE', label: 'Disponible', icon: '✅', dotColor: '#059669' },
  { key: 'ARCHIVEE', label: 'Loué', icon: '🔑', dotColor: '#d97706' },
  { key: 'EN_ATTENTE', label: 'En attente', icon: '⏳', dotColor: '#2563eb' },
  { key: 'SUSPENDUE', label: 'Signalé', icon: '🚩', dotColor: '#e11d48' },
];

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    // Status filter
    if (statusFilter !== 'TOUS' && item.statut !== statusFilter) return false;

    // Search filter
    const term = searchQuery.toLowerCase();
    return (
      item.titre?.toLowerCase().includes(term) ||
      item.bien?.adresse?.ville?.toLowerCase().includes(term) ||
      item.bien?.adresse?.rue?.toLowerCase().includes(term) ||
      item.prix?.toString().includes(term) ||
      item.proprietaire?.nom?.toLowerCase().includes(term) ||
      item.proprietaire?.prenom?.toLowerCase().includes(term)
    );
  });

  // Count by status
  const statusCounts = {
    TOUS: properties.length,
    PUBLIEE: properties.filter(p => p.statut === 'PUBLIEE').length,
    ARCHIVEE: properties.filter(p => p.statut === 'ARCHIVEE').length,
    EN_ATTENTE: properties.filter(p => p.statut === 'EN_ATTENTE').length,
    SUSPENDUE: properties.filter(p => p.statut === 'SUSPENDUE').length,
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Catalogue Immobilier</h2>
          <p className="text-slate-500 font-medium">Gerez et modérez les annonces publiées sur AttouNest.</p>
        </div>
        <div className="bg-primary-100 text-primary-700 px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
          {filteredProperties.length} biens trouvés
        </div>
      </div>

      {/* Search + Status Dropdown Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', alignItems: 'stretch' }}>
        {/* Search bar */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par titre, ville, prix, propriétaire..." 
            style={{
              width: '100%',
              paddingLeft: '52px',
              paddingRight: '24px',
              paddingTop: '16px',
              paddingBottom: '16px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              color: '#334155',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Custom Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', minWidth: '260px' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              height: '100%',
              padding: '14px 18px',
              backgroundColor: '#ffffff',
              border: dropdownOpen ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: dropdownOpen ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
              boxSizing: 'border-box',
            }}
          >
            <Filter size={18} style={{ color: '#64748b', flexShrink: 0 }} />
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: STATUS_OPTIONS.find(o => o.key === statusFilter)?.dotColor || '#64748b',
              flexShrink: 0,
            }} />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {STATUS_OPTIONS.find(o => o.key === statusFilter)?.icon}{' '}
              {STATUS_OPTIONS.find(o => o.key === statusFilter)?.label}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
              backgroundColor: 'rgba(0,0,0,0.06)', color: '#475569',
            }}>
              {statusCounts[statusFilter] || 0}
            </span>
            <ChevronDown size={18} style={{
              color: '#94a3b8', flexShrink: 0,
              transition: 'transform 0.25s ease',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
              zIndex: 50,
              overflow: 'hidden',
              animation: 'dropdownFadeIn 0.2s ease-out',
            }}>
              <div style={{ padding: '6px' }}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = statusFilter === option.key;
                  const count = statusCounts[option.key] || 0;
                  return (
                    <button
                      key={option.key}
                      onClick={() => { setStatusFilter(option.key); setDropdownOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 14px',
                        border: 'none',
                        borderRadius: '12px',
                        backgroundColor: isSelected ? '#f1f5f9' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#0f172a' : '#475569',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: option.dotColor, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{option.icon}</span>
                      <span style={{ flex: 1 }}>{option.label}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: 'rgba(0,0,0,0.05)', color: '#64748b',
                      }}>
                        {count}
                      </span>
                      {isSelected && (
                        <span style={{ color: '#3b82f6', fontSize: '16px', flexShrink: 0 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown animation keyframes */}
      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
                status: item.statut === 'PUBLIEE' ? 'AVAILABLE' : item.statut === 'ARCHIVEE' ? 'RENTED' : item.statut,
                ownerName: item.proprietaire ? `${item.proprietaire.prenom} ${item.proprietaire.nom}` : 'Propriétaire',
                ownerType: item.proprietaire?.typeBailleur || item.proprietaire?.role || 'PROPRIETAIRE',
                publishedAt: item.datePublication,
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
