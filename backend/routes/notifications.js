const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getNotifications, markNotificationRead, getUnreadCount, markAllNotificationsAsRead, deleteNotification } = require('../controllers/notificationController');

const router = express.Router();
router.use(verifyToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id', markNotificationRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
