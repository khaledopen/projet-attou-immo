const express = require('express');
const { 
  createProperty, 
  getProperties, 
  getPropertyById, 
  updateProperty 
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Récupérer la liste de toutes les annonces immobilières
 *     tags: [Properties]
 *     description: |
 *       **Utilisé par :** Tenant App, Owner App, Admin Web
 *       
 *       Retourne toutes les annonces publiées avec les détails du bien et de l'adresse.
 *     parameters:
 *       - in: query
 *         name: ville
 *         schema:
 *           type: string
 *         description: Filtrer par ville (ex. Abidjan)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Prix minimum
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prix maximum
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_ATTENTE, PUBLIEE, ARCHIVEE, REJETEE, SUSPENDUE]
 *         description: Statut de l'annonce
 *       - in: query
 *         name: typeBien
 *         schema:
 *           type: string
 *           enum: [APPARTEMENT, MAISON, STUDIO, VILLA, CHAMBRE]
 *         description: Type de bien
 *     responses:
 *       200:
 *         description: Liste des annonces
 *   post:
 *     summary: Créer une nouvelle annonce (avec Bien et Adresse)
 *     tags: [Properties]
 *     description: |
 *       **Utilisé par :** Owner App
 *       
 *       Crée simultanément l'Adresse, le Bien et l'Annonce. Réservé aux PROPRIETAIRE et ADMIN.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *               - prix
 *               - ville
 *               - rue
 *               - typeBien
 *               - surface
 *             properties:
 *               titre:
 *                 type: string
 *                 example: "Appartement F4 Riviera 3"
 *               description:
 *                 type: string
 *               prix:
 *                 type: number
 *               typeBien:
 *                 type: string
 *                 enum: [APPARTEMENT, MAISON, STUDIO, VILLA, CHAMBRE]
 *               surface:
 *                 type: number
 *               nombrePieces:
 *                 type: integer
 *               nombreChambres:
 *                 type: integer
 *               etage:
 *                 type: integer
 *               equipements:
 *                 type: array
 *                 items:
 *                   type: string
 *               rue:
 *                 type: string
 *               ville:
 *                 type: string
 *               codePostal:
 *                 type: string
 *     responses:
 *       201:
 *         description: Annonce créée avec succès
 */
router.route('/')
  .get(getProperties)
  .post(protect, authorize('PROPRIETAIRE', 'ADMIN'), createProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Détails complets d'une annonce
 *     tags: [Properties]
 *     description: Inclut les données du bien, de l'adresse, du propriétaire et les photos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de l'annonce
 *       404:
 *         description: Annonce non trouvée
 *   put:
 *     summary: Modifier une annonce
 *     tags: [Properties]
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
 *             properties:
 *               titre:
 *                 type: string
 *               description:
 *                 type: string
 *               prix:
 *                 type: number
 *               statut:
 *                 type: string
 *                 enum: [EN_ATTENTE, PUBLIEE, ARCHIVEE, REJETEE, SUSPENDUE]
 *     responses:
 *       200:
 *         description: Annonce mise à jour
 */
router.route('/:id')
  .get(getPropertyById)
  .put(protect, authorize('PROPRIETAIRE', 'ADMIN'), updateProperty);

module.exports = router;
