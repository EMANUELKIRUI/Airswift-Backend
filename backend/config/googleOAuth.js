const { google } = require('googleapis');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// Validate required credentials
if (!clientId || !clientSecret) {
  console.warn('WARNING: Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
}

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const getGoogleAuthUrl = () => {
  const scopes = ['openid', 'profile', 'email'];

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
};

const getTokens = async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
};

const verifyIdToken = async (idToken) => {
  const ticket = await oAuth2Client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  return ticket.getPayload();
};

module.exports = {
  oAuth2Client,
  getGoogleAuthUrl,
  getTokens,
  verifyIdToken,
};
