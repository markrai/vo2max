// Screen Wake Lock management for keeping screen awake during workouts
let wakeLock = null;

// Request wake lock
async function requestWakeLock() {
  try {
    // Check if Wake Lock API is supported
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock activated');
      
      // Handle wake lock release (e.g., when user switches tabs)
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released by system');
      });
      
      return true;
    } else {
      console.warn('Wake Lock API not supported');
      return false;
    }
  } catch (error) {
    console.error('Error requesting wake lock:', error);
    return false;
  }
}

// Release wake lock
async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake lock released');
    } catch (error) {
      console.error('Error releasing wake lock:', error);
    }
  }
}

// Re-request wake lock when page becomes visible again
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    // Check if workout is active
    if (typeof getSelectedDay === 'function' && typeof getStartTime === 'function') {
      const day = getSelectedDay();
      const startTime = getStartTime(day);
      
      if (startTime) {
        // Workout is active, re-request wake lock
        await requestWakeLock();
      }
    }
  }
});

// Expose functions globally
window.requestWakeLock = requestWakeLock;
window.releaseWakeLock = releaseWakeLock;
