const prisma = require('../config/db');

// Helper to format property URLs (same as in propertyController)
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

    // Calculate sum of rents of published properties
    const rentAggregate = await prisma.annonce.aggregate({
      where: { statut: 'PUBLIEE' },
      _sum: { prix: true }
    });
    const totalRent = rentAggregate._sum.prix || 0;

    // Fetch recent visits
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

    res.json({
      locatairesCount,
      proprietairesCount,
      totalUsersCount,
      propertiesCount,
      visitsCount,
      totalRent,
      recentVisits
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
          select: { nom: true, prenom: true, email: true, telephone: true }
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
      where: { statut: 'EN_ATTENTE' },
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
      data: { statut: 'PUBLIEE' },
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

    // Create a notification for all users with the LOCATAIRE role
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
    const { id } = req.params;
    const updated = await prisma.annonce.update({
      where: { id },
      data: { statut: 'REJETEE' }
    });

    if (req.io) {
      req.io.emit('property_updated', updated);
    }

    res.json({ message: 'Annonce rejetée avec succès', annonce: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du rejet de l\'annonce', error: error.message });
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
          select: { titre: true, prix: true }
        }
      }
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des visites', error: error.message });
  }
};
