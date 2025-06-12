// content.js
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

  const styleId = 'notification-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
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
  }

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    notification.addEventListener('animationend', () => {
      document.body.removeChild(notification);
    });
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

// Create button immediately
createLikeButton();

// Also create on window load
window.addEventListener('load', createLikeButton);

// Watch for changes and recreate if needed
const observer = new MutationObserver(() => {
  if (!document.getElementById('spotify-like-button')) {
    createLikeButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });