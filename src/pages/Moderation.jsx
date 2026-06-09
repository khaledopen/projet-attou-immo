import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Eye, MapPin, Home, User, Calendar, Ruler, DoorOpen, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/config';
import { io } from 'socket.io-client';

const Moderation = () => {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null); // Propriété sélectionnée pour le modal de détails

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

    const socketURL = BASE_URL.replace('/api', '');
    const socket = io(socketURL);

    socket.on('property_created', () => fetchPending());
    socket.on('property_updated', () => fetchPending());
    socket.on('property_deleted', (id) => {
      setPendingProperties(prev => prev.filter(p => p.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleApprove = async (id) => {
    try {
      await axios.post(`${BASE_URL}/admin/properties/${id}/approve`);
      setPendingProperties(prev => prev.filter(p => p.id !== id));
      setSelectedProperty(null); // Fermer le modal si ouvert
      alert("L'annonce signalée a été validée et remise en ligne avec succès !");
    } catch (err) {
      console.error('Erreur approbation:', err);
      alert('Impossible de conserver le bien.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette annonce signalée ?")) return;
    try {
      await axios.post(`${BASE_URL}/admin/properties/${id}/reject`);
      setPendingProperties(prev => prev.filter(p => p.id !== id));
      setSelectedProperty(null); // Fermer le modal si ouvert
      alert("L'annonce signalée a été définitivement supprimée de la plateforme.");
    } catch (err) {
      console.error('Erreur rejet:', err);
      alert('Impossible de supprimer le bien.');
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
            <Shield className="text-rose-600" size={40} />
            Signalements
          </h2>
          <p className="text-slate-500 font-medium">Modérez les annonces signalées par les utilisateurs pour contenu inapproprié.</p>
        </div>
        <div className="bg-rose-100 text-rose-700 px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
          {pendingProperties.length} signalé(s)
        </div>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Bien Immobilier</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Propriétaire</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Loyer</th>
              <th className="px-8 py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">État Correction</th>
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
                      {property.raisonSignalement && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 inline-block font-semibold">
                          <span className="font-bold text-rose-800">Motif :</span> {property.raisonSignalement}
                        </div>
                      )}
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
                {/* Colonne État de correction */}
                <td className="px-8 py-6">
                  {property.signalementCorrige ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-emerald-700 text-xs font-bold uppercase tracking-wide">Corrigé</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <span className="text-amber-700 text-xs font-bold uppercase tracking-wide">Non corrigé</span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Bouton voir détails */}
                    <button 
                      onClick={() => setSelectedProperty(property)}
                      className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-blue-100 cursor-pointer"
                      title="Voir les détails"
                    >
                      <Eye size={20} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => handleApprove(property.id)}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-emerald-100 cursor-pointer"
                      title="Conserver l'annonce"
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleReject(property.id)}
                      className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-rose-100 cursor-pointer"
                      title="Supprimer l'annonce"
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
            <p className="text-slate-400 font-bold text-lg">Aucune annonce signalée pour le moment.</p>
          </div>
        )}
      </div>

      {/* ====== MODAL DE DÉTAILS DE L'ANNONCE ====== */}
      {selectedProperty && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedProperty(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.3s ease-out' }}
          >
            {/* En-tête du modal */}
            <div className="relative">
              {/* Galerie photo */}
              {selectedProperty.photos?.length > 0 ? (
                <div className="h-72 overflow-hidden rounded-t-3xl relative">
                  <img 
                    src={selectedProperty.photos[0].url} 
                    alt={selectedProperty.titre} 
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay dégradé */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}></div>
                  {/* Badge état correction */}
                  <div className="absolute top-4 left-4">
                    {selectedProperty.signalementCorrige ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/90 backdrop-blur-sm shadow-lg">
                        <CheckCircle2 size={18} className="text-white" />
                        <span className="text-white text-sm font-bold">Corrigé par le propriétaire</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 backdrop-blur-sm shadow-lg">
                        <AlertTriangle size={18} className="text-white" />
                        <span className="text-white text-sm font-bold">Non corrigé</span>
                      </div>
                    )}
                  </div>
                  {/* Titre sur l'image */}
                  <div className="absolute bottom-4 left-6 right-6">
                    <h3 className="text-white text-2xl font-black mb-1">{selectedProperty.titre}</h3>
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <MapPin size={14} />
                      <span>{selectedProperty.bien?.adresse?.ville || 'Côte d\'Ivoire'}, {selectedProperty.bien?.adresse?.rue || ''}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-slate-100 rounded-t-3xl flex items-center justify-center">
                  <Home size={64} className="text-slate-300" />
                </div>
              )}

              {/* Bouton fermer */}
              <button 
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all cursor-pointer"
              >
                <XCircle size={24} className="text-slate-600" />
              </button>
            </div>

            {/* Contenu du modal */}
            <div className="p-8">
              {/* Galerie miniatures si plusieurs photos */}
              {selectedProperty.photos?.length > 1 && (
                <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
                  {selectedProperty.photos.map((photo, index) => (
                    <img 
                      key={photo.id || index}
                      src={photo.url} 
                      alt={`Photo ${index + 1}`}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-slate-100 flex-shrink-0 hover:border-blue-400 transition-colors cursor-pointer"
                    />
                  ))}
                </div>
              )}

              {/* Motif de signalement */}
              {selectedProperty.raisonSignalement && (
                <div className="mb-8 p-5 bg-rose-50 border border-rose-200 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} className="text-rose-600" />
                    <h4 className="text-rose-800 font-bold text-sm uppercase tracking-wide">Motif du signalement</h4>
                  </div>
                  <p className="text-rose-700 text-sm leading-relaxed">{selectedProperty.raisonSignalement}</p>
                </div>
              )}

              {/* Prix */}
              <div className="mb-8 p-5 bg-primary-50 rounded-2xl border border-primary-100">
                <p className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">Loyer mensuel</p>
                <p className="text-primary-700 text-3xl font-black">{selectedProperty.prix?.toLocaleString()} <span className="text-lg">FCFA</span></p>
              </div>

              {/* Caractéristiques du bien */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <Home size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Type</p>
                  <p className="text-slate-800 font-bold text-sm">{translateTypeBien(selectedProperty.typeBien)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <Ruler size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Surface</p>
                  <p className="text-slate-800 font-bold text-sm">{selectedProperty.surface} m²</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <DoorOpen size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Pièces</p>
                  <p className="text-slate-800 font-bold text-sm">{selectedProperty.nombrePieces}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <DoorOpen size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Chambres</p>
                  <p className="text-slate-800 font-bold text-sm">{selectedProperty.bien?.nombreChambres || '—'}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-3">Description</h4>
                <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl">{selectedProperty.description || 'Aucune description fournie.'}</p>
              </div>

              {/* Équipements */}
              {selectedProperty.bien?.equipements?.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-3">Équipements</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.bien.equipements.map((eq, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Informations propriétaire */}
              <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                    {selectedProperty.proprietaire?.prenom?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">
                      {selectedProperty.proprietaire ? `${selectedProperty.proprietaire.prenom} ${selectedProperty.proprietaire.nom}` : 'Propriétaire'}
                    </p>
                    <p className="text-slate-400 text-xs">{selectedProperty.proprietaire?.email || ''}</p>
                  </div>
                </div>
                {selectedProperty.proprietaire?.telephone && (
                  <p className="text-slate-500 text-sm">
                    📞 {selectedProperty.proprietaire.telephone}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Calendar size={16} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Publié le</p>
                    <p className="text-slate-700 font-medium">{formatDate(selectedProperty.datePublication)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Calendar size={16} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dernière modification</p>
                    <p className="text-slate-700 font-medium">{formatDate(selectedProperty.dateModification)}</p>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button
                  onClick={() => handleApprove(selectedProperty.id)}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 cursor-pointer"
                >
                  <Check size={20} strokeWidth={3} />
                  Valider et remettre en ligne
                </button>
                <button
                  onClick={() => handleReject(selectedProperty.id)}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-200 cursor-pointer"
                >
                  <X size={20} strokeWidth={3} />
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation du modal */}
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Moderation;
