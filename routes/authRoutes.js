const express = require('express');
const { 
  register, 
  login, 
  googleCallbackPage, 
  updateProfile, 
  refreshToken,
  forgotPassword,
  renderResetPasswordPage,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
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
router.get('/google/callback', googleCallbackPage);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Mettre à jour les informations du profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               raisonSociale:
 *                 type: string
 *               typeBailleur:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.put('/profile', protect, updateProfile);
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Envoyer un e-mail de réinitialisation du mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lien de réinitialisation envoyé
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   get:
 *     summary: Afficher la page web de réinitialisation du mot de passe
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page HTML de réinitialisation
 */
router.get('/reset-password', renderResetPasswordPage);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe avec le token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *               - newPassword
 *             properties:
 *               userId:
 *                 type: string
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 */
router.post('/reset-password', resetPassword);

module.exports = router;
