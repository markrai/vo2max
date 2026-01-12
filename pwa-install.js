// PWA Installation and Service Worker Registration

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, prompt user to refresh
              console.log('New service worker available');
            }
          });
        });
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// PWA Installation Prompt
let deferredPrompt;
let installButton = null;
let installPromptEscHandler = null;

// Create install button if not already installed
function createInstallButton() {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    return; // Already installed
  }

  // Check if button already exists
  if (document.getElementById('installButton')) {
    installButton = document.getElementById('installButton');
    return;
  }

  // Create install button
  const button = document.createElement('button');
  button.id = 'installButton';
  button.className = 'button';
  button.textContent = 'Install App';
  button.style.display = 'none';
  button.onclick = installPWA;
  
  // Add to Install tab container
  const installContainer = document.getElementById('installButtonContainer');
  if (installContainer) {
    installContainer.appendChild(button);
    installButton = button;
  }
}

// Install PWA
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
      if (installButton) {
        installButton.style.display = 'none';
      }
    });
  }
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button
  if (installButton) {
    installButton.style.display = 'block';
  } else {
    createInstallButton();
    if (installButton) {
      installButton.style.display = 'block';
    }
  }
  
  // Also show automatic prompt after a delay
  setTimeout(() => {
    showInstallPrompt();
  }, 3000); // Show after 3 seconds
});

// Show automatic install prompt
function showInstallPrompt() {
  if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
    // Create a custom install prompt modal
    const promptModal = document.createElement('div');
    promptModal.className = 'modal-bg';
    promptModal.id = 'installPromptBg';
    promptModal.style.display = 'flex';
    promptModal.innerHTML = `
      <div class="modal">
        <div class="close-btn" onclick="closeInstallPrompt()">✕</div>
        <div class="modal-title">Install VO2 Max Coach</div>
        <div class="label" style="text-align:center; margin: 20px 0;">
          Install this app on your device for a better experience and offline access.
        </div>
        <div class="modal-actions">
          <button class="button" onclick="installPWAFromPrompt()">Install</button>
          <button class="button secondary" onclick="closeInstallPrompt()">Not Now</button>
        </div>
      </div>
    `;
    document.body.appendChild(promptModal);
    
    // Add ESC key handler to close the modal
    installPromptEscHandler = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeInstallPrompt();
      }
    };
    document.addEventListener('keydown', installPromptEscHandler);
    
    // Store prompt state in localStorage to avoid showing too frequently
    localStorage.setItem('installPromptShown', Date.now().toString());
  }
}

// Close install prompt
function closeInstallPrompt() {
  const promptModal = document.getElementById('installPromptBg');
  if (promptModal) {
    promptModal.style.display = 'none';
    promptModal.remove();
  }
  // Remove ESC key handler
  if (installPromptEscHandler) {
    document.removeEventListener('keydown', installPromptEscHandler);
    installPromptEscHandler = null;
  }
}

// Install from prompt
function installPWAFromPrompt() {
  installPWA();
  closeInstallPrompt();
}

// Make functions globally accessible
window.closeInstallPrompt = closeInstallPrompt;
window.installPWAFromPrompt = installPWAFromPrompt;
window.installPWA = installPWA;

// Check if we should show the prompt (not shown in last 24 hours)
function shouldShowInstallPrompt() {
  const lastShown = localStorage.getItem('installPromptShown');
  if (!lastShown) return true;
  
  const lastShownTime = parseInt(lastShown);
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return lastShownTime < oneDayAgo;
}

// Initialize on page load
window.addEventListener('load', () => {
  createInstallButton();
  
  // Check if app is already installed
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('App is already installed');
    return;
  }
  
  // If beforeinstallprompt hasn't fired yet, wait a bit and check again
  setTimeout(() => {
    if (deferredPrompt && shouldShowInstallPrompt()) {
      showInstallPrompt();
    }
  }, 5000); // Show after 5 seconds if prompt is available
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
  if (installButton) {
    installButton.style.display = 'none';
  }
  // Remove install prompt if it's showing
  closeInstallPrompt();
});
