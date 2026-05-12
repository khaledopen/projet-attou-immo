const express = require('express');
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Récupérer les notifications de l'utilisateur connecté
 *     tags: [Notifications]
 *     description: |
 *       **Utilisé par :** Tenant App, Owner App, Admin Web
 *       
 *       Retourne la liste des notifications triées par date décroissante.
 *       Inclut les alertes de demande de visite, les mises à jour de statut, etc.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                     example: "Nouvelle demande de visite"
 *                   content:
 *                     type: string
 *                     example: "Jean Koffi a demandé une visite pour Appartement F4"
 *                   type:
 *                     type: string
 *                     enum: [VISIT_REQUEST, VISIT_UPDATE, SYSTEM]
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié
 */
router.get('/', protect, getNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     description: |
 *       **Utilisé par :** Tenant App, Owner App, Admin Web
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notification
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Notification non trouvée
 */
router.patch('/:id/read', protect, markAsRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     description: |
 *       **Utilisé par :** Tenant App, Owner App, Admin Web
 *       
 *       Marque en une seule action toutes les notifications non lues de l'utilisateur connecté.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Toutes les notifications ont été marquées comme lues
 *       401:
 *         description: Non authentifié
 */
router.patch('/read-all', protect, markAllAsRead);

module.exports = router;
