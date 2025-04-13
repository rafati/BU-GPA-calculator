const { google } = require('googleapis');
const readline = require('readline');

// Use the NextAuth Google OAuth credentials that are already working
const CLIENT_ID = '52824372448-0sldu7j49skgc5qmefholf4slfn4jkq4.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
// Use the exact redirect URI configured in Google Cloud Console
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate a URL for authorization
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent'  // Force consent to get refresh token
});

console.log('Authorize this app by visiting this URL:');
console.log(authUrl);

// Create interface to read the authorization code
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\nIMPORTANT: After you authorize, you will be redirected to a page that might show an error.');
console.log('Look at the URL in your address bar. It will look like:');
console.log('http://localhost:3000/api/auth/callback/google?code=4/SOME_LONG_CODE&scope=...');
console.log('Copy ONLY the value after "code=" and before the next "&"');

rl.question('\nEnter the authorization code from the URL: ', (code) => {
  rl.close();
  
  // Exchange code for tokens
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error getting tokens:', err);
      console.log('\nPossible solutions:');
      console.log('1. Make sure the redirect URI in this script EXACTLY matches what\'s in Google Cloud Console');
      console.log('2. Check that you copied the entire authorization code correctly');
      console.log('3. Verify that the Gmail API is enabled in your Google Cloud project');
      console.log('4. Ensure your OAuth consent screen is properly configured with the gmail.send scope');
      return;
    }
    
    if (!tokens.refresh_token) {
      console.log('\nWARNING: No refresh token was returned! This often happens when:');
      console.log('1. You have already authorized this application (without revoking access)');
      console.log('2. You didn\'t include prompt=consent in the authorization URL');
      console.log('\nTo fix this:');
      console.log('1. Go to https://myaccount.google.com/permissions');
      console.log('2. Revoke access for your application');
      console.log('3. Run this script again');
      console.log('\nFull token response (without refresh token):', JSON.stringify(tokens, null, 2));
      return;
    }
    
    console.log('\nSUCCESS! Refresh Token obtained:');
    console.log(tokens.refresh_token);
    console.log('\nAdd this to your .env.local file as:');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  });
}); 