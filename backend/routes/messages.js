const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { sendMessage, getMessages, markMessageRead } = require('../controllers/messageController');

const router = express.Router();

router.use(verifyToken);
router.post('/', sendMessage);
router.get('/', getMessages);
router.put('/:id', markMessageRead);

module.exports = router;
