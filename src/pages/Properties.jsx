import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, Eye, MapPin, Home, Ruler, DoorOpen, Calendar, XCircle, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
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
  const [selectedProperty, setSelectedProperty] = useState(null); // Propriété sélectionnée pour le modal
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0); // Index de la photo active dans la galerie
  const dropdownRef = useRef(null);

  // Fermer le menu déroulant en cas de clic à l'extérieur
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
    // Filtre de statut
    if (statusFilter !== 'TOUS' && item.statut !== statusFilter) return false;

    // Filtre de recherche
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

  // Compter par statut
  const statusCounts = {
    TOUS: properties.length,
    PUBLIEE: properties.filter(p => p.statut === 'PUBLIEE').length,
    ARCHIVEE: properties.filter(p => p.statut === 'ARCHIVEE').length,
    EN_ATTENTE: properties.filter(p => p.statut === 'EN_ATTENTE').length,
    SUSPENDUE: properties.filter(p => p.statut === 'SUSPENDUE').length,
  };

  // Ouvrir le modal de détails
  const openDetails = (item) => {
    setSelectedProperty(item);
    setCurrentPhotoIndex(0);
  };

  // Naviguer dans la galerie de photos
  const nextPhoto = () => {
    if (selectedProperty?.photos?.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % selectedProperty.photos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedProperty?.photos?.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + selectedProperty.photos.length) % selectedProperty.photos.length);
    }
  };

  // Formater la date en français
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Traduire le type de bien
  const translateTypeBien = (type) => {
    const types = {
      APPARTEMENT: 'Appartement',
      MAISON: 'Maison',
      STUDIO: 'Studio',
      VILLA: 'Villa',
      CHAMBRE: 'Chambre'
    };
    return types[type] || type;
  };

  // Traduire le statut
  const translateStatut = (statut) => {
    const statuts = {
      PUBLIEE: { label: 'Disponible', color: '#059669', bg: '#ecfdf5' },
      ARCHIVEE: { label: 'Loué', color: '#d97706', bg: '#fffbeb' },
      EN_ATTENTE: { label: 'En attente', color: '#2563eb', bg: '#eff6ff' },
      SUSPENDUE: { label: 'Signalé', color: '#e11d48', bg: '#fff1f2' },
      REJETEE: { label: 'Rejeté', color: '#6b7280', bg: '#f9fafb' },
    };
    return statuts[statut] || { label: statut, color: '#64748b', bg: '#f8fafc' };
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

      {/* Ligne de recherche + menu déroulant des statuts */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', alignItems: 'stretch' }}>
        {/* Barre de recherche */}
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

        {/* Menu déroulant personnalisé */}
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

          {/* Menu déroulant */}
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

      {/* Images clés de l'animation du menu déroulant */}
      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {filteredProperties.length === 0 ? (
        <div className="text-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold text-lg">Aucun bien ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProperties.map(item => (
            <div key={item.id} onClick={() => openDetails(item)} style={{ cursor: 'pointer' }}>
              <PropertyCard 
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
            </div>
          ))}
        </div>
      )}

      {/* ====== MODAL DE DÉTAILS DU BIEN ====== */}
      {selectedProperty && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 100, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' 
          }}
          onClick={() => setSelectedProperty(null)}
        >
          <div 
            style={{ 
              backgroundColor: '#fff', borderRadius: '24px', 
              width: '100%', maxWidth: '800px', maxHeight: '90vh', 
              overflowY: 'auto', margin: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              animation: 'modalSlideIn 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Galerie de photos principale */}
            <div style={{ position: 'relative', height: '360px', backgroundColor: '#f1f5f9', borderRadius: '24px 24px 0 0', overflow: 'hidden' }}>
              {selectedProperty.photos?.length > 0 ? (
                <>
                  <img 
                    src={selectedProperty.photos[currentPhotoIndex]?.url} 
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s ease' }}
                  />
                  {/* Overlay dégradé */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
                  
                  {/* Compteur de photos */}
                  <div style={{
                    position: 'absolute', top: '16px', left: '16px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '12px',
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    color: '#fff', fontSize: '13px', fontWeight: 700,
                  }}>
                    📷 {currentPhotoIndex + 1} / {selectedProperty.photos.length}
                  </div>

                  {/* Boutons de navigation gauche/droite */}
                  {selectedProperty.photos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                        style={{
                          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                          width: '44px', height: '44px', borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'}
                      >
                        <ChevronLeft size={22} color="#334155" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                        style={{
                          position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                          width: '44px', height: '44px', borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'}
                      >
                        <ChevronRight size={22} color="#334155" />
                      </button>
                    </>
                  )}

                  {/* Badge de statut */}
                  {(() => {
                    const statut = translateStatut(selectedProperty.statut);
                    return (
                      <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        padding: '8px 16px', borderRadius: '12px',
                        backgroundColor: statut.bg, color: statut.color,
                        fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.5px', border: `1px solid ${statut.color}20`,
                      }}>
                        {statut.label}
                      </div>
                    );
                  })()}

                  {/* Titre sur l'image */}
                  <div style={{ position: 'absolute', bottom: '20px', left: '24px', right: '24px' }}>
                    <h3 style={{ color: '#fff', fontSize: '24px', fontWeight: 900, marginBottom: '6px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {selectedProperty.titre}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
                      <MapPin size={14} />
                      <span>{selectedProperty.bien?.adresse?.ville || 'Côte d\'Ivoire'}, {selectedProperty.bien?.adresse?.rue || ''}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={64} color="#cbd5e1" />
                </div>
              )}

              {/* Bouton fermer */}
              <button 
                onClick={() => setSelectedProperty(null)}
                style={{
                  position: 'absolute', top: '16px', right: selectedProperty.photos?.length > 0 ? undefined : '16px',
                  ...(selectedProperty.photos?.length > 0 ? { right: undefined, left: undefined } : {}),
                  padding: '8px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: selectedProperty.photos?.length > 0 ? 'none' : 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <XCircle size={24} color="#64748b" />
              </button>
            </div>

            {/* Miniatures des photos */}
            {selectedProperty.photos?.length > 1 && (
              <div style={{ 
                display: 'flex', gap: '10px', padding: '16px 24px', 
                overflowX: 'auto', backgroundColor: '#f8fafc',
                borderBottom: '1px solid #f1f5f9',
              }}>
                {selectedProperty.photos.map((photo, index) => (
                  <img 
                    key={photo.id || index}
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    onClick={() => setCurrentPhotoIndex(index)}
                    style={{
                      width: '72px', height: '72px', borderRadius: '12px',
                      objectFit: 'cover', cursor: 'pointer', flexShrink: 0,
                      border: currentPhotoIndex === index ? '3px solid #3b82f6' : '3px solid transparent',
                      opacity: currentPhotoIndex === index ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { if (currentPhotoIndex !== index) e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { if (currentPhotoIndex !== index) e.currentTarget.style.opacity = '0.6'; }}
                  />
                ))}
              </div>
            )}

            {/* Contenu du modal */}
            <div style={{ padding: '32px' }}>
              {/* Prix */}
              <div style={{ 
                marginBottom: '28px', padding: '20px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', 
                border: '1px solid #dbeafe',
              }}>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Loyer mensuel</p>
                <p style={{ color: '#1e40af', fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>
                  {selectedProperty.prix?.toLocaleString()} <span style={{ fontSize: '16px' }}>FCFA</span>
                </p>
              </div>

              {/* Caractéristiques du bien */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <Home size={20} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Type</p>
                  <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>{translateTypeBien(selectedProperty.typeBien)}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <Ruler size={20} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Surface</p>
                  <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>{selectedProperty.surface} m²</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <DoorOpen size={20} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Pièces</p>
                  <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>{selectedProperty.nombrePieces}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <DoorOpen size={20} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Chambres</p>
                  <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>{selectedProperty.bien?.nombreChambres || '—'}</p>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ color: '#1e293b', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Description</h4>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
                  {selectedProperty.description || 'Aucune description fournie.'}
                </p>
              </div>

              {/* Équipements */}
              {selectedProperty.bien?.equipements?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h4 style={{ color: '#1e293b', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Équipements</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedProperty.bien.equipements.map((eq, idx) => (
                      <span key={idx} style={{
                        padding: '6px 14px', backgroundColor: '#eff6ff', color: '#2563eb',
                        borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid #dbeafe',
                      }}>
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Informations propriétaire */}
              <div style={{ 
                marginBottom: '28px', padding: '20px', backgroundColor: '#f8fafc', 
                borderRadius: '16px', border: '1px solid #f1f5f9',
              }}>
                <h4 style={{ color: '#1e293b', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Propriétaire</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2563eb', fontWeight: 800, fontSize: '16px',
                    border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}>
                    {selectedProperty.proprietaire?.prenom?.charAt(0) || 'P'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '15px' }}>
                      {selectedProperty.proprietaire ? `${selectedProperty.proprietaire.prenom} ${selectedProperty.proprietaire.nom}` : 'Propriétaire'}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                      {selectedProperty.proprietaire?.email && (
                        <p style={{ color: '#94a3b8', fontSize: '12px' }}>✉️ {selectedProperty.proprietaire.email}</p>
                      )}
                      {selectedProperty.proprietaire?.telephone && (
                        <p style={{ color: '#94a3b8', fontSize: '12px' }}>📞 {selectedProperty.proprietaire.telephone}</p>
                      )}
                    </div>
                  </div>
                  {selectedProperty.proprietaire?.typeBailleur && (
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7',
                    }}>
                      {selectedProperty.proprietaire.typeBailleur === 'PARTICULIER' ? 'Particulier' :
                       selectedProperty.proprietaire.typeBailleur === 'AGENCE' ? 'Agence' : 
                       selectedProperty.proprietaire.typeBailleur === 'PROMOTEUR' ? 'Promoteur' : 
                       selectedProperty.proprietaire.typeBailleur}
                    </span>
                  )}
                </div>
              </div>

              {/* Adresse complète */}
              {selectedProperty.bien?.adresse && (
                <div style={{ marginBottom: '28px' }}>
                  <h4 style={{ color: '#1e293b', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Adresse</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <MapPin size={18} color="#3b82f6" />
                    <div>
                      <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '14px' }}>
                        {selectedProperty.bien.adresse.rue}, {selectedProperty.bien.adresse.ville}
                      </p>
                      {selectedProperty.bien.adresse.codePostal && (
                        <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                          Code postal : {selectedProperty.bien.adresse.codePostal} — {selectedProperty.bien.adresse.pays || "Côte d'Ivoire"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                  <Calendar size={16} color="#94a3b8" />
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Publié le</p>
                    <p style={{ color: '#475569', fontWeight: 600 }}>{formatDate(selectedProperty.datePublication)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                  <Clock size={16} color="#94a3b8" />
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Dernière modification</p>
                    <p style={{ color: '#475569', fontWeight: 600 }}>{formatDate(selectedProperty.dateModification)}</p>
                  </div>
                </div>
              </div>

              {/* Bouton fermer en bas */}
              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => setSelectedProperty(null)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '16px',
                    backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700,
                    fontSize: '15px', border: 'none', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
