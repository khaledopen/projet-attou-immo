const prisma = require('../config/db');

// Fonction d'aide pour formater les URL de propriétés (comme dans propertyController)
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

exports.getStats = async (req, res) => {
  try {
    const locatairesCount = await prisma.user.count({
      where: { role: 'LOCATAIRE' }
    });

    const proprietairesCount = await prisma.user.count({
      where: { role: 'PROPRIETAIRE' }
    });

    const totalUsersCount = locatairesCount + proprietairesCount;

    const propertiesCount = await prisma.annonce.count({
      where: { statut: 'PUBLIEE' }
    });

    const visitsCount = await prisma.demandeVisite.count();

    // Calculer la somme des loyers des propriétés publiées
    const rentAggregate = await prisma.annonce.aggregate({
      where: { statut: 'PUBLIEE' },
      _sum: { prix: true }
    });
    const totalRent = rentAggregate._sum.prix || 0;

    // Récupérer les visites récentes
    const recentVisits = await prisma.demandeVisite.findMany({
      take: 5,
      orderBy: { dateCreation: 'desc' },
      include: {
        locataire: {
          select: { nom: true, prenom: true, email: true }
        },
        annonce: {
          select: { titre: true, prix: true }
        }
      }
    });

    // Métriques du jour
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayVisitsCount = await prisma.demandeVisite.count({
      where: {
        dateCreation: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const todayUsersCount = await prisma.user.count({
      where: {
        dateInscription: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const todayPropertiesCount = await prisma.annonce.count({
      where: {
        statut: 'PUBLIEE',
        datePublication: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    // Statistiques quotidiennes des 7 derniers jours pour les graphiques
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const dailyStats = await Promise.all(last7Days.map(async (date) => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const users = await prisma.user.count({
        where: {
          dateInscription: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const properties = await prisma.annonce.count({
        where: {
          statut: 'PUBLIEE',
          datePublication: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const visits = await prisma.demandeVisite.count({
        where: {
          dateCreation: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });

      return {
        date: date.toISOString().split('T')[0],
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        users,
        properties,
        visits
      };
    }));

    res.json({
      locatairesCount,
      proprietairesCount,
      totalUsersCount,
      propertiesCount,
      visitsCount,
      totalRent,
      recentVisits,
      todayVisitsCount,
      todayUsersCount,
      todayPropertiesCount,
      dailyStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des stats', error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { dateInscription: 'desc' },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        statut: true,
        dateInscription: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs', error: error.message });
  }
};

exports.getProperties = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const annonces = await prisma.annonce.findMany({
      include: {
        bien: {
          include: { adresse: true }
        },
        proprietaire: {
          select: { nom: true, prenom: true, email: true, telephone: true, typeBailleur: true, raisonSociale: true }
        },
        photos: true
      },
      orderBy: { datePublication: 'desc' }
    });

    res.json(annonces.map(annonce => formatPropertyUrls(annonce, baseUrl)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des biens', error: error.message });
  }
};

exports.getPendingProperties = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const annonces = await prisma.annonce.findMany({
      where: { statut: 'SUSPENDUE' },
      include: {
        bien: {
          include: { adresse: true }
        },
        proprietaire: {
          select: { nom: true, prenom: true, email: true, telephone: true }
        },
        photos: true
      },
      orderBy: { datePublication: 'desc' }
    });

    res.json(annonces.map(annonce => formatPropertyUrls(annonce, baseUrl)));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des biens en attente', error: error.message });
  }
};

exports.approveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.annonce.update({
      where: { id },
      data: { statut: 'PUBLIEE', raisonSignalement: null, signalementCorrige: false },
      include: {
        bien: {
          include: { adresse: true }
        },
        photos: true,
        proprietaire: {
          select: { nom: true, prenom: true }
        }
      }
    });

    // Créer une notification pour tous les utilisateurs ayant le rôle LOCATAIRE
    const tenants = await prisma.user.findMany({
      where: { role: 'LOCATAIRE' }
    });

    if (tenants.length > 0) {
      const ownerName = `${updated.proprietaire?.prenom || ''} ${updated.proprietaire?.nom || ''}`.trim() || 'Un propriétaire';
      const notificationData = tenants.map(tenant => ({
        userId: tenant.id,
        titre: 'Nouvelle annonce disponible',
        contenu: `Une nouvelle annonce a été publiée par ${ownerName} : "${updated.titre}".`,
        lu: false
      }));

      await prisma.notification.createMany({
        data: notificationData
      });
    }

    if (req.io) {
      req.io.emit('property_updated', updated);
      req.io.emit('notification_created');
    }

    res.json({ message: 'Annonce approuvée avec succès', annonce: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'approbation de l\'annonce', error: error.message });
  }
};

exports.rejectProperty = async (req, res) => {
  try {
    const annonceId = req.params.id;
    
    const annonce = await prisma.annonce.findUnique({
      where: { id: annonceId },
      include: { bien: true }
    });

    if (!annonce) {
      return res.status(404).json({ message: 'Annonce non trouvée' });
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

exports.getVisits = async (req, res) => {
  try {
    const visits = await prisma.demandeVisite.findMany({
      orderBy: { dateCreation: 'desc' },
      include: {
        locataire: {
          select: { nom: true, prenom: true, email: true, telephone: true }
        },
        annonce: {
          select: { 
            titre: true, 
            prix: true,
            proprietaire: {
              select: { nom: true, prenom: true, email: true, telephone: true }
            }
          }
        }
      }
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des visites', error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['ACTIF', 'SUSPENDU', 'DESACTIVE'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { statut },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        statut: true,
        dateInscription: true
      }
    });

    res.json({ message: 'Statut de l\'utilisateur mis à jour avec succès', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut', error: error.message });
  }
};

