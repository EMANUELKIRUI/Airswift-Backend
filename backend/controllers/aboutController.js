const Joi = require('joi');
const { About } = require('../models');

// Validation schemas
const aboutSchema = Joi.object({
  section: Joi.string().valid('mission', 'vision', 'values', 'features', 'team').required(),
  title: Joi.string().required(),
  content: Joi.string().required(),
  description: Joi.string().optional(),
  image_url: Joi.string().uri().optional(),
  order: Joi.number().optional(),
  is_active: Joi.boolean().optional(),
});

const updateAboutSchema = Joi.object({
  title: Joi.string().optional(),
  content: Joi.string().optional(),
  description: Joi.string().optional(),
  image_url: Joi.string().uri().optional(),
  order: Joi.number().optional(),
  is_active: Joi.boolean().optional(),
});

// PUBLIC ENDPOINTS

// Get all active about sections
const getAbout = async (req, res) => {
  try {
    const aboutSections = await About.findAll({
      where: { is_active: true },
      order: [['order', 'ASC']],
    });

    res.json({
      message: 'About information retrieved successfully',
      data: aboutSections,
    });
  } catch (error) {
    console.error('Error fetching about:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific about section by section name
const getAboutSection = async (req, res) => {
  try {
    const { section } = req.params;

    const aboutSection = await About.findOne({
      where: { section, is_active: true },
    });

    if (!aboutSection) {
      return res.status(404).json({ message: 'About section not found' });
    }

    res.json({
      message: 'About section retrieved successfully',
      data: aboutSection,
    });
  } catch (error) {
    console.error('Error fetching about section:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN ENDPOINTS

// Get all about sections (including inactive)
const getAllAboutSections = async (req, res) => {
  try {
    const aboutSections = await About.findAll({
      order: [['order', 'ASC']],
    });

    res.json({
      message: 'All about sections retrieved successfully',
      data: aboutSections,
    });
  } catch (error) {
    console.error('Error fetching all about sections:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new about section
const createAboutSection = async (req, res) => {
  try {
    const { error } = aboutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { section, title, content, description, image_url, order, is_active } = req.body;

    // Check if section already exists
    const existingSection = await About.findOne({ where: { section } });
    if (existingSection) {
      return res.status(400).json({
        message: `About section for "${section}" already exists. Use update endpoint instead.`,
      });
    }

    const aboutSection = await About.create({
      section,
      title,
      content,
      description,
      image_url,
      order: order || 0,
      is_active: is_active !== undefined ? is_active : true,
    });

    res.status(201).json({
      message: 'About section created successfully',
      data: aboutSection,
    });
  } catch (error) {
    console.error('Error creating about section:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an about section
const updateAboutSection = async (req, res) => {
  try {
    const { section } = req.params;
    const { error } = updateAboutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const aboutSection = await About.findOne({ where: { section } });
    if (!aboutSection) {
      return res.status(404).json({ message: 'About section not found' });
    }

    await aboutSection.update({
      ...req.body,
      updated_at: new Date(),
    });

    res.json({
      message: 'About section updated successfully',
      data: aboutSection,
    });
  } catch (error) {
    console.error('Error updating about section:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an about section
const deleteAboutSection = async (req, res) => {
  try {
    const { section } = req.params;

    const aboutSection = await About.findOne({ where: { section } });
    if (!aboutSection) {
      return res.status(404).json({ message: 'About section not found' });
    }

    await aboutSection.destroy();

    res.json({ message: 'About section deleted successfully' });
  } catch (error) {
    console.error('Error deleting about section:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle about section visibility
const toggleAboutSection = async (req, res) => {
  try {
    const { section } = req.params;

    const aboutSection = await About.findOne({ where: { section } });
    if (!aboutSection) {
      return res.status(404).json({ message: 'About section not found' });
    }

    await aboutSection.update({
      is_active: !aboutSection.is_active,
      updated_at: new Date(),
    });

    res.json({
      message: `About section ${aboutSection.is_active ? 'activated' : 'deactivated'} successfully`,
      data: aboutSection,
    });
  } catch (error) {
    console.error('Error toggling about section:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  // Public
  getAbout,
  getAboutSection,
  // Admin
  getAllAboutSections,
  createAboutSection,
  updateAboutSection,
  deleteAboutSection,
  toggleAboutSection,
};
