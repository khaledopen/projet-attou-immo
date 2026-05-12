const prisma = require('../config/db');

exports.createProperty = async (req, res) => {
  try {
    const { 
      titre, description, prix, 
      typeBien, surface, nombrePieces, 
      nombreChambres, etage, equipements, anneeConstruction,
      rue, ville, codePostal, latitude, longitude 
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

    // 3. Créer l'annonce liée au bien et au propriétaire
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
      },
      include: {
        bien: {
          include: { adresse: true }
        }
      }
    });

    res.status(201).json(annonce);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'annonce', error: error.message });
  }
};

exports.getProperties = async (req, res) => {
  try {
    const { ville, statut, minPrice, maxPrice, typeBien } = req.query;

    const filters = {};
    if (statut) filters.statut = statut;
    if (typeBien) filters.typeBien = typeBien;
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

    res.json(annonces);
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

    res.json(annonce);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const { titre, description, prix, statut } = req.body;
    const annonceId = req.params.id;

    const existingAnnonce = await prisma.annonce.findUnique({ where: { id: annonceId } });
    if (!existingAnnonce) return res.status(404).json({ message: 'Annonce non trouvée' });
    
    if (existingAnnonce.proprietaireId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const updatedAnnonce = await prisma.annonce.update({
      where: { id: annonceId },
      data: {
        titre,
        description,
        prix: prix ? parseFloat(prix) : undefined,
        statut,
      },
    });

    res.json(updatedAnnonce);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
