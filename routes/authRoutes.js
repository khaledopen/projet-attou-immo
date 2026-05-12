const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur (Locataire, Propriétaire ou Admin)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *               - nom
 *               - prenom
 *             properties:
 *               email:
 *                 type: string
 *               motDePasse:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [LOCATAIRE, PROPRIETAIRE, ADMIN]
 *               telephone:
 *                 type: string
 *               raisonSociale:
 *                 type: string
 *                 description: Requis si role est PROPRIETAIRE
 *               typeBailleur:
 *                 type: string
 *                 enum: [PARTICULIER, AGENCE, PROMOTEUR]
 *                 description: Requis si role est PROPRIETAIRE
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: L'utilisateur existe déjà
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Mappe vers 'motDePasse' côté serveur
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne le token JWT et l'utilisateur
 *       400:
 *         description: Identifiants invalides
 */
router.post('/login', login);

module.exports = router;
