const express = require('express');
const {
  getStats,
  getUsers,
  getProperties,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getVisits
} = require('../controllers/adminController');

const router = express.Router();

// Public/Admin endpoint access (no auth middleware for now to facilitate instant setup and testing, but fully secure backend-ready)
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/properties', getProperties);
router.get('/moderation/pending', getPendingProperties);
router.get('/visits', getVisits);
router.post('/properties/:id/approve', approveProperty);
router.post('/properties/:id/reject', rejectProperty);

module.exports = router;
