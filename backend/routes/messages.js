const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { sendMessage, getMessages, markMessageRead, getRecentMessages, markMessagesAsRead } = require('../controllers/messageController');

const router = express.Router();

router.use(verifyToken);
router.post('/', sendMessage);
router.post('/send', sendMessage);
router.get('/', getMessages);
router.get('/recent', getRecentMessages);
router.put('/mark-as-read', markMessagesAsRead);
router.put('/:id', markMessageRead);

module.exports = router;
