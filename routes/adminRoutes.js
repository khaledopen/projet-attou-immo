const express = require('express');
const {
  getStats,
  getUsers,
  getProperties,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getVisits,
  updateUserStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Appliquer la protection et l'autorisation ADMIN à toutes les routes d'administration
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/properties', getProperties);
router.get('/moderation/pending', getPendingProperties);
router.get('/visits', getVisits);
router.post('/properties/:id/approve', approveProperty);
router.post('/properties/:id/reject', rejectProperty);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
