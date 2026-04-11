const Draft = require('../models/Draft');

// Fallback in-memory storage when MongoDB is not available
const memoryDrafts = new Map();

// Check if MongoDB is available
const isMongoAvailable = () => {
  try {
    // Try to access mongoose connection
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch (error) {
    return false;
  }
};

const getDraft = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let draft = null;

    if (isMongoAvailable()) {
      draft = await Draft.findOne({ userId: req.user.id });
    } else {
      // Use in-memory fallback
      const memoryDraft = memoryDrafts.get(req.user.id);
      if (memoryDraft) {
        draft = { formData: memoryDraft };
      }
    }

    res.json({ form_data: draft ? draft.formData : null });
  } catch (error) {
    console.error('GET DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveDraft = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const form_data = req.body?.form_data ?? req.body;

    if (form_data === undefined || Object.keys(form_data).length === 0) {
      return res.status(400).json({ message: 'form_data is required' });
    }

    let draft = null;

    if (isMongoAvailable()) {
      // Upsert draft - create if doesn't exist, update if exists
      draft = await Draft.findOneAndUpdate(
        { userId: req.user.id },
        {
          formData: form_data,
          lastUpdated: new Date()
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    } else {
      // Use in-memory fallback
      memoryDrafts.set(req.user.id, form_data);
      draft = { formData: form_data };
    }

    res.json({
      message: 'Draft saved',
      form_data: draft.formData
    });
  } catch (error) {
    console.error('SAVE DRAFT ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkDraft = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let draft = null;

    if (isMongoAvailable()) {
      draft = await Draft.findOne({ userId: req.user.id });
    } else {
      // Use in-memory fallback
      const memoryDraft = memoryDrafts.get(req.user.id);
      if (memoryDraft) {
        draft = { formData: memoryDraft };
      }
    }

    // Return draft directly as requested
    res.json(draft ? draft.formData : {});
  } catch (error) {
    console.error("Draft check error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const clearDraft = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isMongoAvailable()) {
      await Draft.findOneAndDelete({ userId: req.user.id });
    } else {
      // Use in-memory fallback
      memoryDrafts.delete(req.user.id);
    }

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
