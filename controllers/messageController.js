const prisma = require('../config/db');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};
    if (userRole === 'PROPRIETAIRE') {
      whereClause.proprietaireId = userId;
    } else {
      whereClause.locataireId = userId;
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
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

    res.json(conversations);
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
    await prisma.message.updateMany({
      where: {
        conversationId,
        expediteurId: { not: req.user.id },
        lu: false
      },
      data: { lu: true }
    });

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

    // Trouver toutes les conversations de l'utilisateur
    let whereClause = {};
    if (userRole === 'PROPRIETAIRE') {
      whereClause.proprietaireId = userId;
    } else {
      whereClause.locataireId = userId;
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
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
    if (req.io) {
      req.io.to(`user_${destinataireId}`).emit('nouveau_message', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
