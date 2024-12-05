const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';  // Replace this with your Spotify Client ID
const SPOTIFY_SCOPE = 'user-library-modify';
let accessToken = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addToLiked') {
    handleAddToLiked(request.songInfo)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function authenticateSpotify() {
  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('redirect_uri', redirectUrl);
  authUrl.searchParams.append('scope', SPOTIFY_SCOPE);
  
  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });
    
    const hashParams = new URLSearchParams(responseUrl.split('#')[1]);
    accessToken = hashParams.get('access_token');
    return accessToken;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

async function handleAddToLiked(songInfo) {
  try {
    if (!accessToken) {
      accessToken = await authenticateSpotify();
    }
    
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songInfo.artist + ' ' + songInfo.title)}&type=track&limit=1`;
    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const searchData = await searchResponse.json();
    if (!searchData.tracks?.items?.length) {
      throw new Error('Song not found on Spotify');
    }

    const trackId = searchData.tracks.items[0].id;
    const likeResponse = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    return { success: likeResponse.ok };
  } catch (error) {
    console.error('Operation failed:', error);
    return { success: false, error: error.message };
  }
}