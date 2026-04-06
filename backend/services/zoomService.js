const axios = require('axios');

const createZoomMeeting = async ({ topic = 'Interview', startTime, duration = 30, timezone = 'UTC' }) => {
  const token = process.env.ZOOM_JWT;

  if (!token) {
    throw new Error('ZOOM_JWT environment variable is required to create Zoom meetings');
  }

  const payload = {
    topic,
    type: 2,
    start_time: new Date(startTime).toISOString(),
    duration,
    timezone,
  };

  const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data.join_url;
};

module.exports = { createZoomMeeting };
