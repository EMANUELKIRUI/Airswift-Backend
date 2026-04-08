const { createClient } = require('redis');
require('dotenv').config();

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;

const isRedisEnabled = REDIS_ENABLED;

if (isRedisEnabled) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (error) => {
    console.error('Redis client error:', error);
  });

  redisClient.connect().then(() => {
    console.log('✅ Redis client connected');
  }).catch((error) => {
    console.warn('⚠️ Redis connection failed:', error.message);
  });
}

module.exports = {
  redisClient,
  isRedisEnabled,
};
