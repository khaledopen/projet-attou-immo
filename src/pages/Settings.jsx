import React, { useState } from 'react';
import { Settings, User, Lock, Bell, Shield, Save, Eye, EyeOff, CheckCircle, SlidersHorizontal } from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  // État du profil
  const [profile, setProfile] = useState({
    nom: 'Administrateur',
    prenom: 'Principal',
    email: 'admin@attounest.com',
    telephone: '',
  });

  // État du mot de passe
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Préférences des notifications
  const [notifications, setNotifications] = useState({
    newUser: true,
    newProperty: true,
    newVisit: true,
    reports: true,
    emailDigest: false,
  });

  // État des règles de gestion
  const [businessRules, setBusinessRules] = useState({
    maxActiveListings: 20,
    maxPhotosPerListing: 10,
  });

  const handleProfileSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordSave = () => {
    if (passwords.new !== passwords.confirm) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    if (passwords.new.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setSaved(true);
    setPasswords({ current: '', new: '', confirm: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleNotificationsSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleBusinessRulesSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { key: 'profile', label: 'Profil', icon: User },
    { key: 'security', label: 'Sécurité', icon: Lock },
    { key: 'rules', label: 'Règles métier', icon: SlidersHorizontal },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-4">
          <Settings className="text-primary-600" size={40} />
          Paramètres
        </h2>
        <p className="text-slate-500 font-medium">Configurez votre compte administrateur et vos préférences.</p>
      </header>

      {/* Notification de succès */}
      {saved && (
        <div className="mb-8 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl font-bold text-sm animate-fade-in">
          <CheckCircle size={20} />
          Modifications enregistrées avec succès.
        </div>
      )}

      <div className="flex gap-8">
        {/* Onglets de la barre latérale */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 w-full px-5 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-primary-600'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
            <Shield size={28} className="mb-3 opacity-80" />
            <h4 className="font-bold text-sm mb-1">Compte sécurisé</h4>
            <p className="text-primary-100 text-xs leading-relaxed">
              Vos données sont protégées par un chiffrement de bout en bout.
            </p>
          </div>
        </div>

        {/* Zone de contenu */}
        <div className="flex-1">
          {/* Onglet Profil */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary-500/30">
                  {profile.prenom[0]}{profile.nom[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{profile.prenom} {profile.nom}</h3>
                  <p className="text-slate-400 font-medium">Administrateur • AttouNest</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={profile.prenom}
                    onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Nom</label>
                  <input
                    type="text"
                    value={profile.nom}
                    onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={profile.telephone}
                    onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                    placeholder="Ex: 07 00 00 00 00"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={handleProfileSave}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save size={18} />
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          )}

          {/* Onglet Sécurité */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Modifier le mot de passe</h3>
              <p className="text-slate-400 font-medium mb-8">Mettez à jour votre mot de passe pour protéger votre compte.</p>

              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={handlePasswordSave}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Lock size={18} />
                  Mettre à jour le mot de passe
                </button>
              </div>

              <div className="mt-12 border-t border-slate-100 pt-8">
                <h4 className="text-lg font-bold text-slate-800 mb-4">Informations de session</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Durée d'inactivité avant déconnexion</p>
                    <p className="text-slate-800 font-bold text-lg">1 heure</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Expiration du token JWT</p>
                    <p className="text-slate-800 font-bold text-lg">15 minutes (auto-refresh)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Préférences de notifications</h3>
              <p className="text-slate-400 font-medium mb-8">Choisissez les événements pour lesquels vous souhaitez être alerté.</p>

              <div className="space-y-4 max-w-xl">
                {[
                  { key: 'newUser', label: 'Nouvel utilisateur inscrit', desc: 'Notification quand un locataire ou propriétaire s\'inscrit.' },
                  { key: 'newProperty', label: 'Nouvelle annonce publiée', desc: 'Notification quand une annonce est soumise à la modération.' },
                  { key: 'newVisit', label: 'Demande de visite', desc: 'Notification quand une nouvelle demande de visite est créée.' },
                  { key: 'reports', label: 'Signalements', desc: 'Notification quand un bien est signalé par un utilisateur.' },
                  { key: 'emailDigest', label: 'Résumé quotidien par email', desc: 'Recevoir un récapitulatif quotidien des activités.' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                    <div>
                      <p className="text-slate-800 font-bold">{item.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 cursor-pointer ${
                        notifications[item.key] ? 'bg-primary-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
                        notifications[item.key] ? 'left-6' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={handleNotificationsSave}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save size={18} />
                  Enregistrer les préférences
                </button>
              </div>
            </div>
          )}

          {/* Onglet Règles de gestion */}
          {activeTab === 'rules' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Règles métier de la plateforme</h3>
              <p className="text-slate-400 font-medium mb-8">Configurez les limites et règles appliquées aux propriétaires et annonces.</p>

              <div className="space-y-8 max-w-xl">
                {/* Nombre maximum d'annonces actives */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-slate-800 font-bold">Annonces actives par propriétaire</p>
                      <p className="text-slate-400 text-xs mt-0.5">Nombre maximum d'annonces simultanément actives (publiées ou en attente).</p>
                    </div>
                    <span className="text-2xl font-black text-primary-600">{businessRules.maxActiveListings}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={businessRules.maxActiveListings}
                    onChange={(e) => setBusinessRules({ ...businessRules, maxActiveListings: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>1</span>
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Nombre maximum de photos par annonce */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-slate-800 font-bold">Photos par annonce</p>
                      <p className="text-slate-400 text-xs mt-0.5">Nombre maximum de photos autorisées pour chaque annonce.</p>
                    </div>
                    <span className="text-2xl font-black text-blue-600">{businessRules.maxPhotosPerListing}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={businessRules.maxPhotosPerListing}
                    onChange={(e) => setBusinessRules({ ...businessRules, maxPhotosPerListing: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Carte d'information */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-amber-800 text-sm font-bold mb-1">⚠️ Note importante</p>
                  <p className="text-amber-600 text-xs leading-relaxed">
                    Ces limites sont appliquées côté serveur via les variables d'environnement <code className="bg-amber-100 px-1 rounded">MAX_ACTIVE_LISTINGS</code> et <code className="bg-amber-100 px-1 rounded">MAX_PHOTOS_PER_LISTING</code>. 
                    Modifiez-les dans le fichier <code className="bg-amber-100 px-1 rounded">.env</code> du backend pour que les changements prennent effet après redémarrage.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={handleBusinessRulesSave}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save size={18} />
                  Enregistrer les règles
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
