// PWA Installation and Service Worker Registration

// Service Worker Registration and Update Management
let serviceWorkerRegistration = null;
let updateAvailable = false;
let updateNotificationShown = false;

// Register Service Worker (without cache-busting on initial load to avoid loops)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js?v=' + (typeof window.APP_VERSION !== 'undefined' ? window.APP_VERSION : '0');
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        serviceWorkerRegistration = registration;
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check if there's a waiting service worker
        // Only show if we haven't just applied an update
        if (registration.waiting && !sessionStorage.getItem('updateApplied')) {
          // Service worker is waiting, show notification
          updateAvailable = true;
          showUpdateNotification();
        } else if (sessionStorage.getItem('updateApplied')) {
          // Update was just applied, clear the flag
          sessionStorage.removeItem('updateApplied');
        }
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New service worker available, prompt user to refresh
                console.log('New service worker available');
                updateAvailable = true;
                // Only show if we haven't shown it already
                if (!updateNotificationShown) {
                  showUpdateNotification();
                }
              } else {
                // First time installation, no need to show update notification
                console.log('Service worker installed for the first time');
              }
            }
          });
        });
        
        // Periodic update check (every 5 minutes)
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// Show update notification banner
function showUpdateNotification() {
  // Don't show if already showing or already shown
  if (document.getElementById('updateNotification') || updateNotificationShown) {
    return;
  }
  
  // Mark as shown to prevent duplicates
  updateNotificationShown = true;
  
  const notification = document.createElement('div');
  notification.id = 'updateNotification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #3d7cff;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    max-width: 90%;
  `;
  notification.innerHTML = `
    <span>New version available!</span>
    <button onclick="reloadForUpdate()" style="
      background: white;
      color: #3d7cff;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
    ">Update Now</button>
    <button onclick="dismissUpdateNotification()" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    ">Later</button>
  `;
  document.body.appendChild(notification);
}

// Reload page to activate new service worker
function reloadForUpdate() {
  // Remove notification before reload
  const notification = document.getElementById('updateNotification');
  if (notification) {
    notification.remove();
  }
  
  // Send skip waiting message to service worker
  if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
    serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  
  // Store flag to prevent showing notification again after reload
  sessionStorage.setItem('updateApplied', 'true');
  
  // Small delay to ensure message is sent, then reload
  setTimeout(() => {
    window.location.reload(true);
  }, 100);
}

// Dismiss update notification
function dismissUpdateNotification() {
  const notification = document.getElementById('updateNotification');
  if (notification) {
    notification.remove();
  }
  // Reset flag so it can show again later if needed
  updateNotificationShown = false;
}

// Make functions globally accessible
window.reloadForUpdate = reloadForUpdate;
window.dismissUpdateNotification = dismissUpdateNotification;

// PWA Installation Prompt
let deferredPrompt;
let installButton = null;
let installPromptEscHandler = null;

// Detect if app is running as installed PWA
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
}

// Show installed state or install prompt in Install tab
function refreshInstallTabContent() {
  const notInstalledEl = document.getElementById('installNotInstalledState');
  const installedEl = document.getElementById('installInstalledState');
  if (!notInstalledEl || !installedEl) return;

  if (isAppInstalled()) {
    notInstalledEl.style.display = 'none';
    installedEl.style.display = 'block';
  } else {
    notInstalledEl.style.display = 'block';
    installedEl.style.display = 'none';
  }
}

// Create install button if not already installed
function createInstallButton() {
  if (isAppInstalled()) {
    refreshInstallTabContent();
    return;
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
  refreshInstallTabContent();
  createInstallButton();
  
  if (isAppInstalled()) {
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
  closeInstallPrompt();
  refreshInstallTabContent();
});

window.refreshInstallTabContent = refreshInstallTabContent;
