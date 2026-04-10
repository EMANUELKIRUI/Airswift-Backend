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
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let user;

    if (isMongooseModel) {
      user = await User.findById(req.user.id).select('draft updatedAt');
    } else if (isSequelizeModel) {
      user = await User.findByPk(req.user.id, { attributes: ['draft', 'updatedAt'] });
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    const hasDraft = Boolean(user.draft);
    const draft = isSequelizeModel && typeof user.draft === 'string'
      ? JSON.parse(user.draft)
      : user.draft;
    const updated_at = hasDraft && user.updatedAt ? new Date(user.updatedAt).toISOString() : null;

    return res.json({ hasDraft, draft, updated_at });
  } catch (error) {
    console.error('CHECK DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
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
