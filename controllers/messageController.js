const prisma = require('../config/db');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { locataireId: userId },
          { proprietaireId: userId }
        ]
      },
      include: {
        locataire: { select: { id: true, nom: true, prenom: true } },
        proprietaire: { select: { id: true, nom: true, prenom: true } },
        annonce: { select: { id: true, titre: true } },
        messages: {
          orderBy: { dateEnvoi: 'desc' },
          take: 1
        }
      },
      orderBy: { dateMiseAJour: 'desc' }
    });

    const conversationsWithStatus = await Promise.all(
      conversations.map(async (conv) => {
        if (conv.annonceId) {
          const visite = await prisma.demandeVisite.findFirst({
            where: {
              locataireId: conv.locataireId,
              annonceId: conv.annonceId
            },
            select: { statut: true }
          });
          return {
            ...conv,
            statutVisite: visite ? visite.statut : null
          };
        }
        return { ...conv, statutVisite: null };
      })
    );

    // Filtrer les conversations pour masquer celles qui sont refusées si l'utilisateur actuel est le propriétaire
    const filteredConversations = conversationsWithStatus.filter(conv => {
      if (conv.proprietaireId === userId && conv.statutVisite === 'REFUSEE') {
        return false;
      }
      return true;
    });

    res.json(filteredConversations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Vérifier l'accès
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation non trouvée' });
    if (conversation.locataireId !== req.user.id && conversation.proprietaireId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Marquer les messages de l'autre comme lus
    const updateResult = await prisma.message.updateMany({
      where: {
        conversationId,
        expediteurId: { not: req.user.id },
        lu: false
      },
      data: { lu: true }
    });

    if (updateResult.count > 0 && req.io) {
      req.io.to(`user_${req.user.id}`).emit('unread_count_update');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { dateEnvoi: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { locataireId: userId },
          { proprietaireId: userId }
        ]
      },
      select: { id: true }
    });

    const conversationIds = conversations.map(c => c.id);

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        expediteurId: { not: userId },
        lu: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { contenu } = req.body;
    const expediteurId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation non trouvée' });
    if (conversation.locataireId !== expediteurId && conversation.proprietaireId !== expediteurId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Si l'expéditeur est le locataire, vérifier que sa demande de visite pour ce bien est acceptée
    if (expediteurId === conversation.locataireId && conversation.annonceId) {
      const visite = await prisma.demandeVisite.findFirst({
        where: {
          locataireId: conversation.locataireId,
          annonceId: conversation.annonceId
        },
        select: { statut: true }
      });
      if (!visite || visite.statut !== 'ACCEPTEE') {
        return res.status(403).json({ 
          message: "Vous ne pouvez pas envoyer de message tant que le propriétaire n'a pas accepté votre demande de visite." 
        });
      }
    }

    const newMessage = await prisma.message.create({
      data: {
        contenu,
        expediteurId,
        conversationId
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { dateMiseAJour: new Date() }
    });

    const destinataireId = conversation.locataireId === expediteurId ? conversation.proprietaireId : conversation.locataireId;
    console.log(`[SocketServer] ✉️ Nouveau message de ${expediteurId} pour ${destinataireId}. Contenu: "${contenu}"`);
    if (req.io) {
      const room = `user_${destinataireId}`;
      req.io.to(room).emit('nouveau_message', newMessage);
      req.io.to(room).emit('unread_count_update');
      console.log(`[SocketServer] 📣 Événement 'nouveau_message' et 'unread_count_update' émis vers la room: ${room}`);
    } else {
      console.warn('[SocketServer] ⚠️ req.io n\'est pas disponible dans la requête.');
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation non trouvée' });
    if (conversation.locataireId !== userId && conversation.proprietaireId !== userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const updateResult = await prisma.message.updateMany({
      where: {
        conversationId,
        expediteurId: { not: userId },
        lu: false
      },
      data: { lu: true }
    });

    if (updateResult.count > 0 && req.io) {
      req.io.to(`user_${userId}`).emit('unread_count_update');
    }

    res.json({ success: true, markedCount: updateResult.count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
