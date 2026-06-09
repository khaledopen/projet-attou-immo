const express = require('express');
const { 
  requestVisit, 
  getTenantVisits, 
  getOwnerVisits, 
  updateVisitStatus,
  cancelVisit,
  updateVisitDate
} = require('../controllers/visitController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

/**
 * @swagger
 * /api/visits:
 *   post:
 *     summary: Demander une visite pour une annonce
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annonceId
 *               - dateProposee
 *             properties:
 *               annonceId:
 *                 type: string
 *               dateProposee:
 *                 type: string
 *                 format: date-time
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Demande créée
 */
router.post('/', protect, requestVisit);

/**
 * @swagger
 * /api/visits/tenant:
 *   get:
 *     summary: Visites demandées par le locataire
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des visites
 */
router.get('/tenant', protect, getTenantVisits);

/**
 * @swagger
 * /api/visits/owner:
 *   get:
 *     summary: Visites reçues par le propriétaire
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des visites reçues
 */
router.get('/owner', protect, getOwnerVisits);

/**
 * @swagger
 * /api/visits/{id}/status:
 *   patch:
 *     summary: Changer le statut d'une visite
 *     tags: [Visits]
 */
router.patch('/:id/status', protect, updateVisitStatus);

/**
 * @swagger
 * /api/visits/{id}/cancel:
 *   patch:
 *     summary: Annuler une demande de visite (locataire uniquement, statut EN_ATTENTE)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Demande annulée avec succès
 *       400:
 *         description: La demande n'est pas en attente
 *       403:
 *         description: Non autorisé
 */
router.patch('/:id/cancel', protect, cancelVisit);

/**
 * @swagger
 * /api/visits/{id}/date:
 *   patch:
 *     summary: Modifier la date proposée d'une visite (locataire, statut EN_ATTENTE uniquement)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dateProposee
 *             properties:
 *               dateProposee:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Date mise à jour
 *       400:
 *         description: La demande n'est pas en attente
 */
router.patch('/:id/date', protect, updateVisitDate);

module.exports = router;
