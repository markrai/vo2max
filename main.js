// Main initialization and event handlers
// Initialize phase display element
phaseDisplayEl = document.getElementById('phaseDisplay');
if (phaseDisplayEl) {
  phaseDisplayEl.dataset.phaseState = "idle";
  phaseDisplayEl.addEventListener('click', promptCancelWorkout);
}

// Setup modal click-outside-to-close handlers
const modalBg = document.getElementById('modalBg');
const cancelModalBg = document.getElementById('cancelModalBg');
const workoutSummaryModalBg = document.getElementById('workoutSummaryModalBg');

if (modalBg) {
  modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg && typeof closeModal === 'function') closeModal();
  });
}

if (cancelModalBg) {
  cancelModalBg.addEventListener('click', (e) => {
    if (e.target === cancelModalBg && typeof closeCancelModal === 'function') closeCancelModal();
  });
}

if (workoutSummaryModalBg) {
  workoutSummaryModalBg.addEventListener('click', (e) => {
    if (e.target === workoutSummaryModalBg && typeof closeWorkoutSummaryModal === 'function') closeWorkoutSummaryModal();
  });
}

// Clean up stale workout sessions on app startup
function cleanupStaleWorkoutSessions() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  
  days.forEach(day => {
    const sessionStart = localStorage.getItem(`session_start_${day}`);
    if (sessionStart) {
      const sessionAge = now - parseInt(sessionStart);
      if (sessionAge > MAX_SESSION_AGE_MS) {
        // Stale session - clean it up
        console.warn(`Cleaning up stale workout session for ${day} (age: ${Math.round(sessionAge / (1000 * 60 * 60))} hours)`);
        localStorage.removeItem(`start_${day}`);
        localStorage.removeItem(`session_id_${day}`);
        localStorage.removeItem(`session_start_${day}`);
        localStorage.removeItem(`summary_emitted_${day}`);
        localStorage.removeItem(`paused_${day}`);
        localStorage.removeItem(`paused_elapsed_${day}`);
      }
    }
  });
}

// Initialize app
loadProfile();
(async () => {
  // Clean up stale workout sessions first
  cleanupStaleWorkoutSessions();
  
  await initializeWorkoutPlan();
  updateDisplay();
  setInterval(updateDisplay, 1000);
  
  // Load SISU settings on app init
  if (typeof window.loadSisuSettings === 'function') {
    await window.loadSisuSettings();
  }
})();

// Set app version display
if (typeof window.APP_VERSION !== 'undefined') {
  const versionEl = document.getElementById('appVersion');
  if (versionEl) {
    versionEl.textContent = 'v' + window.APP_VERSION;
  }
}
