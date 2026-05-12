import React from 'react';
import { MapPin, Home, Clock } from 'lucide-react';

const PropertyCard = ({ property }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-primary-100 transition-all duration-500 group">
      <div className="h-56 bg-slate-100 relative overflow-hidden">
        {property.imageUrl ? (
          <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Home size={64} strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-5 right-5 px-4 py-1.5 bg-white/90 backdrop-blur-md text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
          {property.status === 'AVAILABLE' ? 'Disponible' : 'Loué'}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-black text-slate-900 group-hover:text-primary-600 transition-colors leading-tight flex-1 mr-2">{property.title}</h3>
          <p className="text-primary-600 font-black text-lg">{property.price.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-6 font-medium">
          <MapPin size={14} className="text-primary-500" />
          <span>{property.city}, {property.address}</span>
        </div>
        
        <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-50 border-2 border-white shadow-sm flex items-center justify-center text-primary-600 font-bold text-xs">
              {property.ownerName?.charAt(0) || 'P'}
            </div>
            <div>
              <p className="text-slate-900 text-xs font-bold">{property.ownerName || 'Propriétaire'}</p>
              <p className="text-slate-400 text-[10px]">Bailleur certifié</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-bold">
            <Clock size={12} />
            <span>2j</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
