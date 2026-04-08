const Message = require('../models/Message');
const User = require('../models/User');
const { emitDirectMessage } = require('../utils/socketEmitter');

const sendMessage = async (req, res) => {
  try {
    const { receiverId, subject, text, interview_date, interview_time, attachment_path, applicationId } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ message: 'receiverId and text are required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      subject,
      text,
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

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { withUserId } = req.query;

    if (!withUserId) {
      return res.status(400).json({ message: 'withUserId query parameter is required' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};
