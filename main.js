// Main initialization and event handlers
// Initialize phase display element
phaseDisplayEl = document.getElementById('phaseDisplay');
if (phaseDisplayEl) {
  phaseDisplayEl.dataset.phaseState = "idle";
  phaseDisplayEl.addEventListener('click', promptCancelWorkout);
}

// Initialize app
loadProfile();
initializeWorkoutPlan();
updateDisplay();
setInterval(updateDisplay, 1000);

