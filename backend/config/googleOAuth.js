const { google } = require('googleapis');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// Validate required credentials
if (!clientId || !clientSecret) {
  console.warn('WARNING: Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
} else {
  console.log('✅ Google OAuth configured:');
  console.log('   Client ID:', clientId.substring(0, 20) + '...');
  console.log('   Redirect URI:', redirectUri);
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
  try {
    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oAuth2Client.getToken(code);
    
    console.log('✅ Tokens received from Google:');
    console.log('   - ID Token:', tokens.id_token ? '✓ present' : '✗ missing');
    console.log('   - Access Token:', tokens.access_token ? '✓ present' : '✗ missing');
    console.log('   - Refresh Token:', tokens.refresh_token ? '✓ present' : '✗ missing');
    
    return tokens;
  } catch (error) {
    console.error('❌ Error exchanging code for tokens:', error.message);
    console.error('   Error details:', error);
    throw new Error(`Token exchange failed: ${error.message}`);
  }
};

const verifyIdToken = async (idToken) => {
  try {
    console.log('🔍 Verifying ID token with Google...');
    const ticket = await oAuth2Client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    console.log('✅ ID token verified successfully:');
    console.log('   - Email:', payload.email);
    console.log('   - Name:', payload.name);
    console.log('   - Google ID:', payload.sub);
    
    return payload;
  } catch (error) {
    console.error('❌ ID token verification failed:', error.message);
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

module.exports = {
  oAuth2Client,
  getGoogleAuthUrl,
  getTokens,
  verifyIdToken,
};
