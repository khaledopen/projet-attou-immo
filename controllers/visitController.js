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

    // Trouver ou créer la conversation entre le locataire et le propriétaire pour cette annonce
    let conversation = await prisma.conversation.findFirst({
      where: {
        locataireId,
        proprietaireId: annonce.proprietaireId,
        annonceId: annonce.id
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          locataireId,
          proprietaireId: annonce.proprietaireId,
          annonceId: annonce.id
        }
      });
    }

    // Créer le message système initial dans la conversation
    const initialMessage = await prisma.message.create({
      data: {
        contenu: `SYSTEM_PENDING|${annonce.titre}|${req.user.prenom} ${req.user.nom}`,
        expediteurId: locataireId,
        conversationId: conversation.id
      }
    });

    // Mettre à jour la date de mise à jour de la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { dateMiseAJour: new Date() }
    });

    // Notification Temps Réel via Socket.io pour la demande de visite
    if (req.io) {
      req.io.to(`user_${annonce.proprietaireId}`).emit('notification', {
        type: 'NOUVELLE_VISITE',
        title: 'AttouHome : Nouvelle demande',
        message: `${req.user.prenom} souhaite visiter "${annonce.titre}"`,
        data: demandeVisite
      });
      // Émettre également le nouveau message système
      req.io.to(`user_${annonce.proprietaireId}`).emit('nouveau_message', initialMessage);
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
      include: {
        locataire: {
          select: { id: true, prenom: true, nom: true }
        },
        annonce: {
          include: {
            proprietaire: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                telephone: true
              }
            }
          }
        }
      }
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

    // Trouver ou recréer la conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        locataireId: visite.locataireId,
        proprietaireId: visite.annonce.proprietaireId,
        annonceId: visite.annonce.id
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          locataireId: visite.locataireId,
          proprietaireId: visite.annonce.proprietaireId,
          annonceId: visite.annonce.id
        }
      });
    }

    // Créer un message de mise à jour de statut dans la conversation
    let statusMessageContent = '';
    if (statut === 'ACCEPTEE') {
      statusMessageContent = `SYSTEM_ACCEPTED|${visite.annonce.titre}|${visite.locataire.prenom} ${visite.locataire.nom}|${visite.annonce.proprietaire.telephone || 'non renseigné'}`;
    } else if (statut === 'REFUSEE') {
      statusMessageContent = `SYSTEM_REFUSED|${visite.annonce.titre}|${visite.locataire.prenom} ${visite.locataire.nom}`;
    }

    let statusMessage = null;
    if (statusMessageContent) {
      statusMessage = await prisma.message.create({
        data: {
          contenu: statusMessageContent,
          expediteurId: visite.annonce.proprietaireId,
          conversationId: conversation.id
        }
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { dateMiseAJour: new Date() }
      });
    }

    // Notification au locataire
    if (req.io) {
      const room = `user_${visite.locataireId}`;
      console.log(`[SocketServer] 📣 Notification de statut de visite émise vers: ${room}`);
      req.io.to(room).emit('notification', {
        type: 'STATUT_VISITE_MAJ',
        title: 'AttouHome : Statut mis à jour',
        message: `Votre demande pour "${updatedVisite.annonce.titre}" a été ${statut.toLowerCase()}`,
        data: updatedVisite
      });

      if (statusMessage) {
        console.log(`[SocketServer] 📣 Message système de visite émis vers: ${room}`);
        req.io.to(room).emit('nouveau_message', statusMessage);
      }
    } else {
      console.warn('[SocketServer] ⚠️ req.io n\'est pas disponible pour notifier le locataire.');
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

// Annulation d'une demande de visite par le locataire
exports.cancelVisit = async (req, res) => {
  try {
    const visiteId = req.params.id;
    const locataireId = req.user.id;

    const visite = await prisma.demandeVisite.findUnique({
      where: { id: visiteId },
      include: {
        annonce: { select: { titre: true, proprietaireId: true } }
      }
    });

    if (!visite) return res.status(404).json({ message: 'Visite non trouvée' });

    if (visite.locataireId !== locataireId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (visite.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ message: 'Seule une demande en attente peut être annulée.' });
    }

    const updatedVisite = await prisma.demandeVisite.update({
      where: { id: visiteId },
      data: { statut: 'ANNULEE' },
      include: { annonce: { select: { titre: true } } }
    });

    // Notifier le propriétaire
    if (req.io) {
      req.io.to(`user_${visite.annonce.proprietaireId}`).emit('notification', {
        type: 'VISITE_ANNULEE',
        title: 'Demande annulée',
        message: `${req.user.prenom} a annulé sa demande pour "${visite.annonce.titre}"`,
      });
    }

    await prisma.notification.create({
      data: {
        userId: visite.annonce.proprietaireId,
        titre: 'Demande annulée',
        contenu: `${req.user.prenom} ${req.user.nom} a annulé sa demande de visite pour ${visite.annonce.titre}`,
      }
    });

    res.json({ message: 'Demande annulée avec succès', visite: updatedVisite });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Modification de la date proposée par le locataire (uniquement si EN_ATTENTE)
exports.updateVisitDate = async (req, res) => {
  try {
    const visiteId = req.params.id;
    const locataireId = req.user.id;
    const { dateProposee } = req.body;

    if (!dateProposee) {
      return res.status(400).json({ message: 'La nouvelle date est obligatoire.' });
    }

    const visite = await prisma.demandeVisite.findUnique({
      where: { id: visiteId },
      include: {
        annonce: { select: { titre: true, proprietaireId: true } }
      }
    });

    if (!visite) return res.status(404).json({ message: 'Visite non trouvée' });

    if (visite.locataireId !== locataireId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (visite.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ message: 'La date ne peut être modifiée que si la demande est en attente.' });
    }

    const updatedVisite = await prisma.demandeVisite.update({
      where: { id: visiteId },
      data: { dateProposee: new Date(dateProposee) },
      include: { annonce: { select: { titre: true } } }
    });

    // Notifier le propriétaire du changement de date
    if (req.io) {
      req.io.to(`user_${visite.annonce.proprietaireId}`).emit('notification', {
        type: 'VISITE_DATE_MODIFIEE',
        title: 'Date de visite modifiée',
        message: `${req.user.prenom} a modifié la date de visite pour "${visite.annonce.titre}"`,
      });
    }

    await prisma.notification.create({
      data: {
        userId: visite.annonce.proprietaireId,
        titre: 'Date de visite modifiée',
        contenu: `${req.user.prenom} ${req.user.nom} a modifié la date de visite proposée pour "${visite.annonce.titre}".`,
      }
    });

    res.json({ message: 'Date de visite mise à jour avec succès', visite: updatedVisite });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Expiration automatique des demandes après 72h sans réponse
exports.expireVisits = async (io) => {
  try {
    const now = new Date();
    const expirationLimit = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const expiredVisits = await prisma.demandeVisite.findMany({
      where: {
        statut: 'EN_ATTENTE',
        dateCreation: { lt: expirationLimit }
      },
      include: {
        locataire: { select: { id: true, prenom: true, nom: true } },
        annonce: { select: { titre: true, proprietaireId: true } }
      }
    });

    for (const visite of expiredVisits) {
      await prisma.demandeVisite.update({
        where: { id: visite.id },
        data: { statut: 'REFUSEE' }
      });

      await prisma.notification.create({
        data: {
          userId: visite.locataireId,
          titre: 'Demande expirée',
          contenu: `Votre demande de visite pour "${visite.annonce.titre}" a expiré car le propriétaire n'a pas répondu dans les 72h.`,
        }
      });

      if (io) {
        io.to(`user_${visite.locataireId}`).emit('notification', {
          type: 'VISITE_EXPIREE',
          title: 'Demande expirée',
          message: `Votre demande pour "${visite.annonce.titre}" a expiré (72h sans réponse).`,
        });
      }

      console.log(`[Expiration] Visite ${visite.id} pour "${visite.annonce.titre}" expirée.`);
    }

    if (expiredVisits.length > 0) {
      console.log(`[Expiration] ${expiredVisits.length} demande(s) expirée(s) traitée(s).`);
    }
  } catch (error) {
    console.error('[Expiration] Erreur lors de l\'expiration des visites:', error.message);
  }
};

