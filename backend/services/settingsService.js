const { Settings } = require('../models');
const { redisClient, isRedisEnabled } = require('../config/redisClient');

const cacheKeys = {
  all: 'settings:all',
  category: (category) => `settings:category:${category}`,
  key: (key) => `settings:key:${key}`,
};

const formatSetting = (setting) => {
  if (!setting) return null;
  const raw = setting.toJSON ? setting.toJSON() : setting;

  return {
    id: raw.id,
    key: raw.key,
    value: raw.value,
    description: raw.description,
    category: raw.category || 'general',
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};

const cacheRead = async (cacheKey, fetcher) => {
  if (!isRedisEnabled) {
    return fetcher();
  }

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const fresh = await fetcher();
    await redisClient.set(cacheKey, JSON.stringify(fresh), { EX: 300 });
    return fresh;
  } catch (error) {
    console.warn('settingsService cache error:', error.message);
    return fetcher();
  }
};

const invalidateCache = async (...keys) => {
  if (!isRedisEnabled) {
    return;
  }

  try {
    await redisClient.del(keys.filter(Boolean));
  } catch (error) {
    console.warn('settingsService cache clear error:', error.message);
  }
};

const getAllSettings = async () => {
  return cacheRead(cacheKeys.all, async () => {
    const settings = await Settings.findAll();
    return settings.map(formatSetting);
  });
};

const getSettingsByCategory = async (category) => {
  if (!category) {
    return [];
  }

  const allSettings = await getAllSettings();
  return allSettings.filter((setting) => {
    if (setting.category === category) return true;
    if (typeof setting.value === 'object' && setting.value !== null && setting.value.category === category) return true;
    if (setting.key.startsWith(`${category}.`)) return true;
    return false;
  });
};

const getSettingByKey = async (key) => {
  if (!key) {
    return null;
  }

  return cacheRead(cacheKeys.key(key), async () => {
    const setting = await Settings.findOne({ where: { key } });
    return formatSetting(setting);
  });
};

const createSetting = async ({ key, value, description = null, category = 'general' }) => {
  const existingSetting = await Settings.findOne({ where: { key } });
  if (existingSetting) {
    throw new Error('Setting with this key already exists');
  }

  const setting = await Settings.create({ key, value, description, category });
  await invalidateCache(cacheKeys.all, cacheKeys.category(category), cacheKeys.key(key));
  return formatSetting(setting);
};

const updateSetting = async (key, { value, description, category }) => {
  const setting = await Settings.findOne({ where: { key } });
  if (!setting) {
    throw new Error('Setting not found');
  }

  const oldCategory = setting.category || 'general';
  const newCategory = category || oldCategory;

  await setting.update({ value, description, category: newCategory, updated_at: new Date() });
  await invalidateCache(cacheKeys.all, cacheKeys.category(oldCategory), cacheKeys.category(newCategory), cacheKeys.key(key));

  return formatSetting(setting);
};

const deleteSetting = async (key) => {
  const setting = await Settings.findOne({ where: { key } });
  if (!setting) {
    throw new Error('Setting not found');
  }

  await setting.destroy();
  await invalidateCache(cacheKeys.all, cacheKeys.category(setting.category || 'general'), cacheKeys.key(key));
  return true;
};

const getFeatureFlags = async () => {
  const settings = await getAllSettings();
  return settings
    .filter((setting) => setting.key.startsWith('feature_') || setting.category === 'feature')
    .reduce((flags, setting) => {
      flags[setting.key] = setting.value;
      return flags;
    }, {});
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getFeatureFlags,
};
