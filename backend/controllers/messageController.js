const Message = require('../models/Message');
const User = require('../models/User');
const { emitDirectMessage } = require('../utils/socketEmitter');

const sendMessage = async (req, res) => {
  try {
    // Allow both admin and users to send messages
    const {
      receiverId,
      user_id,
      subject,
      text,
      message: messageText,
      interview_date,
      interview_time,
      attachment_path,
      applicationId,
    } = req.body;

    const finalReceiverId = receiverId || user_id;
    const finalText = text || messageText;

    if (!finalReceiverId || !finalText) {
      return res.status(400).json({ message: 'receiverId/user_id and message/text are required' });
    }

    const receiver = await User.findById(finalReceiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // If sender is not admin, they can only send to admin
    if (req.user.role !== 'admin' && receiver.role !== 'admin') {
      return res.status(403).json({ message: 'Users can only send messages to admin' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId: finalReceiverId,
      subject,
      text: finalText,
      interview_date: interview_date ? new Date(interview_date) : null,
      interview_time: interview_time || null,
      attachment_path: attachment_path || null,
      is_read: false,
      applicationId: applicationId || null,
    });

    const populatedMessage = await message
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    emitDirectMessage(populatedMessage);

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { withUserId } = req.query;

    const filter = withUserId
      ? {
          $or: [
            { senderId: req.user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: req.user.id },
          ],
        }
      : {
          $or: [
            { senderId: req.user.id },
            { receiverId: req.user.id },
          ],
        };

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    // Transform messages to match frontend expectations
    const transformedMessages = messages.map(msg => ({
      id: msg._id,
      content: msg.text,
      sender: msg.senderId?.role === 'admin' ? 'admin' : 'user',
      timestamp: msg.createdAt,
      read: msg.is_read,
      attachment: msg.attachment_path ? {
        name: msg.attachment_path.split('/').pop(),
        url: msg.attachment_path,
      } : null,
    }));

    res.json({ success: true, messages: transformedMessages });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const markMessageRead = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      receiverId: req.user.id,
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.is_read = true;
    await message.save();

    res.json({ success: true, message });
  } catch (err) {
    console.error('markMessageRead error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getRecentMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const messages = await Message.find({
      $or: [
        { senderId: req.user.id },
        { receiverId: req.user.id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    res.json({ messages });
  } catch (err) {
    console.error('getRecentMessages error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const result = await Message.updateMany(
      {
        receiverId: req.user.id,
        is_read: false,
      },
      { is_read: true }
    );

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    console.error('markMessagesAsRead error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessageRead,
  getRecentMessages,
  markMessagesAsRead,
};
