const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { sendMessage, getMessages } = require('../controllers/messageController');

const router = express.Router();

router.use(verifyToken);
router.post('/', sendMessage);
router.get('/', getMessages);

module.exports = router;
