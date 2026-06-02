const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, messageController.getConversations);
router.get('/unread-count', protect, messageController.getUnreadCount);
router.get('/:conversationId/messages', protect, messageController.getMessages);
router.post('/:conversationId/messages', protect, messageController.sendMessage);

module.exports = router;
