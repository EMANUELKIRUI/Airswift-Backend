const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socketEmitter');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      is_read: false,
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createNotification = async ({ userId, title, message, link }) => {
  const notification = new Notification({
    userId,
    title,
    message,
    link,
  });
  await notification.save();
  emitNotification({ userId, notification });
  return notification;
};

module.exports = {
  getNotifications,
  markNotificationRead,
  getUnreadCount,
  createNotification,
};
