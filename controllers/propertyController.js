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
        statut: 'EN_ATTENTE',
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

    // 1. Update address and bien if they exist
    if (existingAnnonce.bienId) {
      await prisma.bien.update({
        where: { id: existingAnnonce.bienId },
        data: {
          typeBien,
          surface: surface ? parseFloat(surface) : undefined,
          nombreChambres: nombreChambres ? parseInt(nombreChambres) : undefined,
          etage: etage !== undefined ? (etage ? parseInt(etage) : null) : undefined,
          equipements: equipements || undefined,
          anneeConstruction: anneeConstruction ? parseInt(anneeConstruction) : undefined,
          adresse: existingAnnonce.bien.adresseId ? {
            update: {
              rue,
              ville,
              codePostal,
            }
          } : undefined
        }
      });
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

    // 3. Update annonce itself
    const updatedAnnonce = await prisma.annonce.update({
      where: { id: annonceId },
      data: {
        titre,
        description,
        prix: prix ? parseFloat(prix) : undefined,
        statut,
        surface: surface ? parseFloat(surface) : undefined,
        nombrePieces: nombrePieces ? parseInt(nombrePieces) : undefined,
        typeBien,
      },
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

    // Delete photos
    await prisma.photo.deleteMany({
      where: { annonceId }
    });

    // Delete demands of visits
    await prisma.demandeVisite.deleteMany({
      where: { annonceId }
    });

    // Delete the annonce itself
    await prisma.annonce.delete({
      where: { id: annonceId }
    });

    // Delete the associated bien & address
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
