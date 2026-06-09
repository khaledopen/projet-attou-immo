const prisma = require('../config/db');

const cleanPhotoUrl = (url) => {
  if (!url) return '';
  const idx = url.indexOf('/uploads/');
  if (idx !== -1) {
    return url.substring(idx);
  }
  return url;
};

const getBaseUrl = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
};

const formatPropertyUrls = (property, baseUrl) => {
  if (!property) return null;
  const formatted = { ...property };
  if (formatted.photos) {
    formatted.photos = formatted.photos.map(photo => {
      let url = cleanPhotoUrl(photo.url);
      if (url && (url.startsWith('/uploads/') || url.startsWith('uploads/'))) {
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${cleanPath}`;
      }
      return { ...photo, url };
    });
  }
  return formatted;
};


// Limite configurable : nombre max d'annonces actives par propriétaire
const MAX_ACTIVE_LISTINGS = parseInt(process.env.MAX_ACTIVE_LISTINGS) || 20;
// Limite configurable : nombre max de photos par annonce
const MAX_PHOTOS_PER_LISTING = parseInt(process.env.MAX_PHOTOS_PER_LISTING) || 10;

exports.createProperty = async (req, res) => {
  try {
    const { 
      titre, description, prix, 
      typeBien, surface, nombrePieces, 
      nombreChambres, etage, equipements, anneeConstruction,
      rue, ville, codePostal, latitude, longitude,
      photos
    } = req.body;
    
    const proprietaireId = req.user.id;

    // Vérifier le nombre d'annonces actives du propriétaire
    const activeCount = await prisma.annonce.count({
      where: {
        proprietaireId,
        statut: { in: ['PUBLIEE', 'EN_ATTENTE'] }
      }
    });

    if (activeCount >= MAX_ACTIVE_LISTINGS) {
      return res.status(400).json({ 
        message: `Vous avez atteint la limite de ${MAX_ACTIVE_LISTINGS} annonces actives. Archivez ou supprimez une annonce existante.` 
      });
    }

    // Vérifier le nombre de photos
    if (photos && photos.length > MAX_PHOTOS_PER_LISTING) {
      return res.status(400).json({ 
        message: `Vous ne pouvez pas ajouter plus de ${MAX_PHOTOS_PER_LISTING} photos par annonce.` 
      });
    }

    // 1. Créer l'adresse
    const adresse = await prisma.adresse.create({
      data: {
        rue,
        ville,
        codePostal,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      }
    });

    // 2. Créer le bien lié à l'adresse
    const bien = await prisma.bien.create({
      data: {
        typeBien,
        surface: parseFloat(surface),
        etage: etage ? parseInt(etage) : null,
        nombreChambres: parseInt(nombreChambres) || 0,
        equipements: equipements || [],
        anneeConstruction: anneeConstruction ? parseInt(anneeConstruction) : null,
        adresseId: adresse.id,
      }
    });

    // 3. Créer l'annonce liée au bien, au propriétaire, et aux photos
    const annonce = await prisma.annonce.create({
      data: {
        titre,
        description,
        prix: parseFloat(prix),
        surface: parseFloat(surface),
        nombrePieces: parseInt(nombrePieces) || 0,
        typeBien,
        statut: 'PUBLIEE',
        proprietaireId,
        bienId: bien.id,
        photos: {
          create: (photos || []).map((url, index) => ({
            url: cleanPhotoUrl(url),
            ordre: index,
          }))
        }
      },
      include: {
        bien: {
          include: { adresse: true }
        },
        photos: true
      }
    });

    if (req.io) {
      req.io.emit('property_created', annonce);
    }

    res.status(201).json(formatPropertyUrls(annonce, getBaseUrl(req)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'annonce', error: error.message });
  }
};

exports.getProperties = async (req, res) => {
  try {
    const { ville, statut, minPrice, maxPrice, typeBien, proprietaireId } = req.query;

    const filters = {};
    if (statut) filters.statut = statut;
    if (typeBien) filters.typeBien = typeBien;
    if (proprietaireId) filters.proprietaireId = proprietaireId;
    if (minPrice || maxPrice) {
      filters.prix = {};
      if (minPrice) filters.prix.gte = parseFloat(minPrice);
      if (maxPrice) filters.prix.lte = parseFloat(maxPrice);
    }
    
    // Filtre par ville (situé dans l'adresse liée au bien)
    if (ville) {
      filters.bien = {
        adresse: {
          ville: { contains: ville, mode: 'insensitive' }
        }
      };
    }

    const annonces = await prisma.annonce.findMany({
      where: filters,
      include: {
        bien: {
          include: { adresse: true }
        },
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
          },
        },
        photos: true,
      },
      orderBy: { datePublication: 'desc' },
    });

    const baseUrl = getBaseUrl(req);
    res.json(annonces.map(annonce => formatPropertyUrls(annonce, baseUrl)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const annonce = await prisma.annonce.findUnique({
      where: { id: req.params.id },
      include: {
        bien: {
          include: { adresse: true }
        },
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            raisonSociale: true
          },
        },
        photos: true,
      },
    });

    if (!annonce) return res.status(404).json({ message: 'Annonce non trouvée' });

    res.json(formatPropertyUrls(annonce, getBaseUrl(req)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const { 
      titre, description, prix, statut,
      typeBien, surface, nombrePieces, nombreChambres, etage, equipements, anneeConstruction,
      rue, ville, codePostal, photos
    } = req.body;
    const annonceId = req.params.id;

    const existingAnnonce = await prisma.annonce.findUnique({ 
      where: { id: annonceId },
      include: {
        bien: true
      }
    });
    if (!existingAnnonce) return res.status(404).json({ message: 'Annonce non trouvée' });
    
    if (existingAnnonce.proprietaireId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Vérifier la limite d'annonces actives si on passe au statut PUBLIEE
    if (statut === 'PUBLIEE' && existingAnnonce.statut !== 'PUBLIEE') {
      const activeCount = await prisma.annonce.count({
        where: {
          proprietaireId: existingAnnonce.proprietaireId,
          statut: { in: ['PUBLIEE', 'EN_ATTENTE'] }
        }
      });

      if (activeCount >= MAX_ACTIVE_LISTINGS) {
        return res.status(400).json({ 
          message: `Vous avez atteint la limite de ${MAX_ACTIVE_LISTINGS} annonces actives. Archivez ou supprimez une autre annonce d'abord.` 
        });
      }
    }

    // 1. Update address and bien if they exist
    if (existingAnnonce.bienId) {
      const hasBienUpdate = typeBien || surface || nombreChambres || etage !== undefined || equipements || anneeConstruction;
      const hasAdresseUpdate = rue || ville || codePostal;

      if (hasBienUpdate || hasAdresseUpdate) {
        await prisma.bien.update({
          where: { id: existingAnnonce.bienId },
          data: {
            typeBien,
            surface: surface ? parseFloat(surface) : undefined,
            nombreChambres: nombreChambres ? parseInt(nombreChambres) : undefined,
            etage: etage !== undefined ? (etage ? parseInt(etage) : null) : undefined,
            equipements: equipements || undefined,
            anneeConstruction: anneeConstruction ? parseInt(anneeConstruction) : undefined,
            adresse: (hasAdresseUpdate && existingAnnonce.bien.adresseId) ? {
              update: {
                rue: rue || undefined,
                ville: ville || undefined,
                codePostal: codePostal || undefined,
              }
            } : undefined
          }
        });
      }
    }

    // 2. Handle photos update
    if (photos !== undefined) {
      await prisma.photo.deleteMany({
        where: { annonceId }
      });
      if (photos && photos.length > 0) {
        await prisma.photo.createMany({
          data: photos.map((url, index) => ({
            url: cleanPhotoUrl(url),
            ordre: index,
            annonceId
          }))
        });
      }
    }

    // 3. Mettre à jour l'annonce elle-même
    // Si l'annonce est actuellement signalée (SUSPENDUE), marquer comme corrigée
    const annonceUpdateData = {
        titre,
        description,
        prix: prix ? parseFloat(prix) : undefined,
        statut,
        surface: surface ? parseFloat(surface) : undefined,
        nombrePieces: nombrePieces ? parseInt(nombrePieces) : undefined,
        typeBien,
    };

    if (existingAnnonce.statut === 'SUSPENDUE') {
      annonceUpdateData.signalementCorrige = true;
    }

    const updatedAnnonce = await prisma.annonce.update({
      where: { id: annonceId },
      data: annonceUpdateData,
      include: {
        bien: {
          include: { adresse: true }
        },
        photos: true,
        proprietaire: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    // 4. Emit socket update event to all clients
    if (req.io) {
      req.io.emit('property_updated', updatedAnnonce);
    }

    res.json(formatPropertyUrls(updatedAnnonce, getBaseUrl(req)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const annonceId = req.params.id;

    const annonce = await prisma.annonce.findUnique({
      where: { id: annonceId },
      include: { bien: true }
    });

    if (!annonce) {
      return res.status(404).json({ message: 'Annonce non trouvée' });
    }

    if (annonce.proprietaireId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Non autorisé à supprimer cette annonce' });
    }

    // Supprimer les photos
    await prisma.photo.deleteMany({
      where: { annonceId }
    });

    // Supprimer les demandes de visites
    await prisma.demandeVisite.deleteMany({
      where: { annonceId }
    });

    // Supprimer l'annonce elle-même
    await prisma.annonce.delete({
      where: { id: annonceId }
    });

    // Supprimer le bien et l'adresse associés
    if (annonce.bienId) {
      const bien = await prisma.bien.findUnique({
        where: { id: annonce.bienId }
      });
      
      await prisma.bien.delete({
        where: { id: annonce.bienId }
      });

      if (bien && bien.adresseId) {
        await prisma.adresse.delete({
          where: { id: bien.adresseId }
        });
      }
    }

    if (req.io) {
      req.io.emit('property_deleted', annonceId);
    }

    res.json({ message: 'Annonce supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'annonce', error: error.message });
  }
};

exports.reportProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body; // Nouveau champ de description
    const updated = await prisma.annonce.update({
      where: { id },
      data: { statut: 'SUSPENDUE', raisonSignalement: description, signalementCorrige: false }
    });

    // 1. Trouver un administrateur pour lui faire porter le message
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Si aucun admin n'existe en base, on en utilise un par défaut ou on prend l'utilisateur qui signale (req.user)
    const adminId = admin ? admin.id : req.user.id;

    // 2. Créer ou trouver la conversation entre l'admin (qui joue le rôle de "locataire" dans le schéma) et le propriétaire
    let conversation = await prisma.conversation.findFirst({
      where: {
        locataireId: adminId,
        proprietaireId: updated.proprietaireId,
        annonceId: id
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          locataireId: adminId,
          proprietaireId: updated.proprietaireId,
          annonceId: id
        }
      });
    }

    // 3. Créer le message d'avertissement
    const warningMessageText = `[ADMIN_WARN] Votre annonce "${updated.titre}" a été signalée par un utilisateur pour le motif suivant : "${description}". Veuillez corriger l'annonce dans les 24h qui suivent, sous peine de voir votre annonce définitivement retirée de la plateforme.`;
    const warningMessage = await prisma.message.create({
      data: {
        contenu: warningMessageText,
        expediteurId: adminId,
        conversationId: conversation.id
      },
      include: {
        conversation: {
          include: {
            annonce: true,
            locataire: { select: { id: true, nom: true, prenom: true } },
            proprietaire: { select: { id: true, nom: true, prenom: true } }
          }
        }
      }
    });

    // 4. Créer la notification en base de données pour le propriétaire
    await prisma.notification.create({
      data: {
        userId: updated.proprietaireId,
        titre: 'Alerte : Annonce signalée',
        contenu: `Votre annonce "${updated.titre}" a été signalée. Vous avez 24h pour la corriger.`,
      }
    });

    // 5. Émettre les événements socket en temps réel
    if (req.io) {
      // Retirer l'annonce du flux des locataires
      req.io.emit('property_deleted', id);
      req.io.emit('property_updated', updated);

      // Envoyer le message de l'admin en temps réel à l'owner
      const ownerRoom = `user_${updated.proprietaireId}`;
      req.io.to(ownerRoom).emit('nouveau_message', warningMessage);

      // Envoyer la notification d'alerte en temps réel à l'owner
      req.io.to(ownerRoom).emit('notification', {
        type: 'ANNONCE_SIGNALEE',
        title: 'Alerte : Annonce signalée',
        message: `Votre annonce "${updated.titre}" a été signalée. Vous disposez de 24h pour la corriger.`,
        data: updated
      });
      console.log(`[SocketServer] 🚨 Annonce ${id} signalée. Avertissement admin envoyé à l'owner room ${ownerRoom}`);
    }

    res.json({ message: 'Annonce signalée avec succès et avertissement envoyé au propriétaire.' });
  } catch (error) {
    console.error('Erreur reportProperty:', error);
    res.status(500).json({ message: 'Erreur lors du signalement', error: error.message });
  }
};
