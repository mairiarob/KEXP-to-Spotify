# KEXP to Spotify Extension

## 🎵 What It Does
This Chrome extension adds a button to KEXP.org that lets you instantly add the currently playing song to your Spotify Liked Songs playlist with a single click.

## 📁 Files Needed
Create a new folder (e.g., on your desktop called "KEXP Extension") for your extension with these files. For each file, just open a new Notepad file and save in KEXP Extension folder. When saving, hit "All files" (not ".txt") and use the ".json" or ".js" extension indicated below:

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "KEXP to Spotify",
  "version": "1.0",
  "description": "Add songs currently playing on KEXP.org directly to your Spotify Liked Songs with a single click.",
  "permissions": [
    "identity",
    "storage"
  ],
  "host_permissions": [
    "https://accounts.spotify.com/*",
    "https://api.spotify.com/*",
    "https://kexp.org/*",
    "https://www.kexp.org/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": [
      "https://kexp.org/*",
      "https://www.kexp.org/*"
    ],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

### background.js
```javascript
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
```

### content.js
```javascript
function createNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
    background-color: ${type === 'error' ? '#ff4444' : '#1DB954'};
    color: white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes successPop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      75% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    notification.addEventListener('animationend', () => {
      document.body.removeChild(notification);
    });
    style.textContent += `
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
  }, 3000);
}

function createLikeButton() {
  if (document.getElementById('spotify-like-button')) return;
  
  const button = document.createElement('button');
  button.id = 'spotify-like-button';
  button.innerHTML = '♥ Add to Spotify';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 20px;
    background: #1DB954;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  `;
  
  button.addEventListener('mouseover', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
  });
  
  button.addEventListener('click', async () => {
    const artistElement = document.querySelector('[data-player-meta="artist_name"]');
    const songElement = document.querySelector('[data-player-meta="song_title"]');
    
    if (artistElement && songElement) {
      button.disabled = true;
      button.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite">↻</span> Adding...';
      
      const artist = artistElement.textContent.trim();
      const title = songElement.textContent.trim().replace(/^[\s–-]+/, '');
      
      chrome.runtime.sendMessage({
        action: 'addToLiked',
        songInfo: { artist, title }
      }, response => {
        if (response?.success) {
          button.style.animation = 'successPop 0.5s ease-out';
          button.innerHTML = '✓ Added!';
          button.style.background = '#1ed760';
          createNotification(`Added "${title}" by ${artist} to your Liked Songs`, 'success');
        } else {
          button.style.animation = 'shake 0.5s ease-in-out';
          button.innerHTML = '✗ Failed';
          button.style.background = '#ff4444';
          const errorMessage = response?.error === 'Song not found on Spotify' 
            ? `Couldn't find "${title}" by ${artist} on Spotify`
            : 'Failed to add song. Please try again.';
          createNotification(errorMessage, 'error');
        }
        
        button.disabled = false;
        setTimeout(() => {
          button.style.animation = '';
          button.style.background = '#1DB954';
          button.innerHTML = '♥ Add to Spotify';
        }, 2000);
      });
    }
  });
  
  document.body.appendChild(button);
}

createLikeButton();

window.addEventListener('load', createLikeButton);

const observer = new MutationObserver(() => {
  if (!document.getElementById('spotify-like-button')) {
    createLikeButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```

### icon.png
Use any 128x128 icon image file. (E.g., save a square version of the KEXP logo as icon.png in the folder)

## 🔧 Installation Instructions (For Users)

1. **Get Your Spotify Credentials**:
   - Go to https://developer.spotify.com/dashboard
   - Log in with your Spotify account
   - Click "Create App"
   - Fill in the app name (e.g., "KEXP to Spotify")
   - Set the Redirect URI to: `https://your-extension-id.chromiumapp.org/` (you'll get the exact URI in step 4)
   - Save your Client ID (you'll need it later)

2. **Download and Set Up the Extension**:
   - Download all the files from this repository
   - Create a new folder and place all files inside
   - Edit background.js and replace 'YOUR_SPOTIFY_CLIENT_ID' with your Client ID from step 1

3. **Install in Chrome**:
   - Open Chrome and go to chrome://extensions/
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the folder containing your extension files

4. **Final Setup**:
   - After loading the extension, find your extension ID on the chrome://extensions page
   - Go back to your Spotify Developer Dashboard
   - Edit your app's settings
   - Add the redirect URI: `https://your-extension-id.chromiumapp.org/`
   - Replace "your-extension-id" with your actual extension ID

5. **Use the Extension**:
   - Visit KEXP.org
   - You'll see a green "Add to Spotify" button in the top right
   - Click it to add the currently playing song to your Spotify Liked Songs

## 🌟 Features
- One-click adding to Spotify Liked Songs
- Visual feedback for success/failure
- Handles authentication automatically
- Works with both www.kexp.org and kexp.org

## ⚠️ Troubleshooting
- If the button doesn't appear, try refreshing the page
- Make sure you're using the correct Spotify Client ID
- Verify the redirect URI matches your extension ID exactly
- Clear your browser cache if needed

## 📝 Notes
- This extension requires a Spotify account
- You'll need to authorize the extension on first use
- The extension only adds songs to your Liked Songs playlist
