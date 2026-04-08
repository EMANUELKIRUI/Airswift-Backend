const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getNotifications, markNotificationRead, getUnreadCount } = require('../controllers/notificationController');

const router = express.Router();
router.use(verifyToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id', markNotificationRead);

module.exports = router;
