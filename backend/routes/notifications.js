const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getNotifications, markAsRead, getUnreadCount } = require('../controllers/notificationController');

const router = express.Router();
router.use(verifyToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/:id/read', markAsRead);

module.exports = router;
