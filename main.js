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

// Initialize app
loadProfile();
(async () => {
  await initializeWorkoutPlan();
  updateDisplay();
  setInterval(updateDisplay, 1000);
})();

// Set app version display
if (typeof window.APP_VERSION !== 'undefined') {
  const versionEl = document.getElementById('appVersion');
  if (versionEl) {
    versionEl.textContent = 'v' + window.APP_VERSION;
  }
}
