const { google } = require('googleapis');

const CLIENT_ID = '52824372448-0sldu7j49skgc5qmefholf4slfn4jkq4.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

// Your authorization code from the previous step
const CODE = '4/0Ab_5qlmvKyHlmufka0hA6z59s0KFQJ5vMQqNn63NgvE8as94Rmhtb8H9zTbjdKyBrCV0EQ';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getTokens() {
  try {
    const { tokens } = await oauth2Client.getToken(CODE);
    console.log('Access Token:', tokens.access_token);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Full response:', JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
  }
}

getTokens(); 