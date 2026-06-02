const prisma = require('../config/db');

exports.requestVisit = async (req, res) => {
  try {
    const { annonceId, dateProposee, message } = req.body;
    const locataireId = req.user.id;

    const annonce = await prisma.annonce.findUnique({
      where: { id: annonceId },
      select: { id: true, titre: true, proprietaireId: true }
    });

    if (!annonce) return res.status(404).json({ message: 'Annonce non trouvée' });

    // Vérifier si une demande de visite existe déjà pour ce locataire et cette annonce
    const existingDemande = await prisma.demandeVisite.findFirst({
      where: {
        annonceId,
        locataireId,
        statut: { in: ['EN_ATTENTE', 'ACCEPTEE'] }
      }
    });

    if (existingDemande) {
      return res.status(409).json({ 
        message: 'Vous avez déjà une demande de visite en cours pour ce bien.' 
      });
    }

    const demandeVisite = await prisma.demandeVisite.create({
      data: {
        annonceId,
        locataireId,
        dateProposee: new Date(dateProposee),
        message,
        statut: 'EN_ATTENTE'
      },
      include: {
        locataire: {
          select: { prenom: true, nom: true }
        },
        annonce: {
          select: { titre: true }
        }
      }
    });

    // Notification Temps Réel via Socket.io
    if (req.io) {
      req.io.to(`user_${annonce.proprietaireId}`).emit('notification', {
        type: 'NOUVELLE_VISITE',
        title: 'AttouHome : Nouvelle demande',
        message: `${req.user.prenom} souhaite visiter "${annonce.titre}"`,
        data: demandeVisite
      });
    }

    // Création de la notification persistante en base
    await prisma.notification.create({
      data: {
        userId: annonce.proprietaireId,
        titre: 'Demande de visite',
        contenu: `${req.user.prenom} ${req.user.nom} a demandé une visite pour ${annonce.titre}`,
      }
    });

    res.status(201).json(demandeVisite);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la demande', error: error.message });
  }
};

exports.getTenantVisits = async (req, res) => {
  try {
    const visites = await prisma.demandeVisite.findMany({
      where: { locataireId: req.user.id },
      include: {
        annonce: {
          include: { photos: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });
    res.json(visites);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getOwnerVisits = async (req, res) => {
  try {
    const visites = await prisma.demandeVisite.findMany({
      where: {
        annonce: {
          proprietaireId: req.user.id
        }
      },
      include: {
        locataire: {
          select: { prenom: true, nom: true, telephone: true }
        },
        annonce: {
          select: { titre: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });
    res.json(visites);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateVisitStatus = async (req, res) => {
  try {
    const { statut } = req.body;
    const visiteId = req.params.id;

    const visite = await prisma.demandeVisite.findUnique({
      where: { id: visiteId },
      include: { annonce: true }
    });

    if (!visite) return res.status(404).json({ message: 'Visite non trouvée' });
    
    if (visite.annonce.proprietaireId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const updatedVisite = await prisma.demandeVisite.update({
      where: { id: visiteId },
      data: { statut },
      include: {
        annonce: { select: { titre: true } }
      }
    });

    if (statut === 'ACCEPTEE') {
      const existingConv = await prisma.conversation.findFirst({
        where: {
          locataireId: visite.locataireId,
          proprietaireId: visite.annonce.proprietaireId,
          annonceId: visite.annonce.id
        }
      });
      if (!existingConv) {
        await prisma.conversation.create({
          data: {
            locataireId: visite.locataireId,
            proprietaireId: visite.annonce.proprietaireId,
            annonceId: visite.annonce.id
          }
        });
      }
    }

    // Notification au locataire
    if (req.io) {
      req.io.to(`user_${visite.locataireId}`).emit('notification', {
        type: 'STATUT_VISITE_MAJ',
        title: 'AttouHome : Statut mis à jour',
        message: `Votre demande pour "${updatedVisite.annonce.titre}" a été ${statut.toLowerCase()}`,
        data: updatedVisite
      });
    }

    await prisma.notification.create({
      data: {
        userId: visite.locataireId,
        titre: 'Mise à jour de visite',
        contenu: `Votre demande pour ${updatedVisite.annonce.titre} est désormais : ${statut}`,
      }
    });

    res.json(updatedVisite);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
