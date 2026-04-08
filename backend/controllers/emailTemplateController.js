const EmailTemplate = require('../models/EmailTemplate');

const getAllTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ updatedAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('getAllTemplates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('getTemplateById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ message: 'name, subject, and body are required' });
    }

    const existing = await EmailTemplate.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Template name already exists' });
    }

    const template = new EmailTemplate({ name, subject, body });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error('createTemplate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { name, subject, body } = req.body;
    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (body) template.body = body;

    await template.save();
    res.json(template);
  } catch (error) {
    console.error('updateTemplate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
