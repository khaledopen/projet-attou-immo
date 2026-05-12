const express = require('express');
const { 
  requestVisit, 
  getTenantVisits, 
  getOwnerVisits, 
  updateVisitStatus 
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
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [ACCEPTEE, REFUSEE, ANNULEE]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/status', protect, updateVisitStatus);

module.exports = router;
