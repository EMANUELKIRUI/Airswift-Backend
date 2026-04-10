const User = require('../models/User');

const isMongooseModel = User.prototype && typeof User.prototype.save === 'function';
const isSequelizeModel = User.prototype && typeof User.prototype.update === 'function';

const getDraft = async (req, res) => {
  try {
    let user;

    if (isMongooseModel) {
      user = await User.findById(req.user.id).select('draft');
    } else if (isSequelizeModel) {
      user = await User.findByPk(req.user.id, { attributes: ['draft'] });
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ form_data: user.draft || null });
  } catch (error) {
    console.error('GET DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveDraft = async (req, res) => {
  try {
    const form_data = req.body?.form_data ?? req.body;

    if (form_data === undefined || Object.keys(form_data).length === 0) {
      return res.status(400).json({ message: 'form_data is required' });
    }

    let updatedUser;

    if (isMongooseModel) {
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { draft: form_data },
        { new: true, select: 'draft' }
      );
    } else if (isSequelizeModel) {
      const [affectedRows] = await User.update(
        { draft: JSON.stringify(form_data) },
        { where: { id: req.user.id } }
      );

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      updatedUser = await User.findByPk(req.user.id, { attributes: ['draft'] });
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    const draftValue = isSequelizeModel && typeof updatedUser.draft === 'string'
      ? JSON.parse(updatedUser.draft)
      : updatedUser.draft;

    res.json({ message: 'Draft saved', form_data: draftValue || null });
  } catch (error) {
    console.error('SAVE DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkDraft = async (req, res) => {
  try {
    // ✅ SAFE CHECK
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    console.log("👉 REQ.USER:", req.user);

    const userId = req.user.id;

    let user;

    if (isMongooseModel) {
      user = await User.findById(userId).select('draft');
    } else if (isSequelizeModel) {
      user = await User.findByPk(userId, { attributes: ['draft'] });
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    const draft = isSequelizeModel && typeof user.draft === 'string'
      ? JSON.parse(user.draft)
      : user.draft;

    return res.json({
      hasDraft: !!draft,
      draft: draft || null,
    });
  } catch (error) {
    console.error("Draft check error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message, // 👈 helps debugging
    });
  }
};

const clearDraft = async (req, res) => {
  try {
    let updatedUser;

    if (isMongooseModel) {
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { draft: null },
        { new: true, select: 'draft' }
      );
    } else if (isSequelizeModel) {
      const [affectedRows] = await User.update(
        { draft: null },
        { where: { id: req.user.id } }
      );

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      updatedUser = await User.findByPk(req.user.id, { attributes: ['draft'] });
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Draft cleared', form_data: null });
  } catch (error) {
    console.error('CLEAR DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDraft,
  saveDraft,
  checkDraft,
  clearDraft,
};
