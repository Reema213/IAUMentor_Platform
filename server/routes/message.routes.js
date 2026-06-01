const express = require('express');
const router = express.Router();
const { sendMessage, getConversations, getMessages, markAsRead, deleteMessage, searchUsers, getUnreadCount } = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/send', verifyToken, sendMessage);
router.get('/conversations', verifyToken, getConversations);
router.get('/conversation/:userId', verifyToken, getMessages);
router.put('/:messageId/read', verifyToken, markAsRead);
router.delete('/:messageId', verifyToken, deleteMessage);
router.get('/search/users', verifyToken, searchUsers);
router.get('/unread/count', verifyToken, getUnreadCount);

module.exports = router;