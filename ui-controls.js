// UI controls and display updates
let selectedDay = null; // Track selected day for testing (null = today)

function cycleToNextDay() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const currentDay = selectedDay || todayName();
  const currentIndex = days.indexOf(currentDay);
  const nextIndex = (currentIndex + 1) % days.length;
  selectedDay = days[nextIndex];
  updateDisplay();
}

function getSelectedDay() {
  return selectedDay || todayName();
}

// Make function globally accessible
window.getSelectedDay = getSelectedDay;
window.cycleToNextDay = cycleToNextDay;

const PHASE_STYLE_MAP = {
  "Warm-Up": { stroke: "#ffad5c", background: "rgba(255,173,92,0.18)", text: "#ffe9cc" },
  "Sustain": { stroke: "#3d7cff", background: "rgba(61,124,255,0.18)", text: "#dbe5ff" },
  "Cool-Down": { stroke: "#4ade80", background: "rgba(74,222,128,0.18)", text: "#e6fff2" },
  Rest: { stroke: "#888", background: "#1c1c1c", text: "#fff" },
  idle: { stroke: "#3d7cff", background: "#232323", text: "#fff" },
  completed: { stroke: "#64ffda", background: "rgba(100,255,218,0.2)", text: "#d5fff7" }
};
const DEFAULT_PHASE_STYLE = { stroke: "#3d7cff", background: "#232323", text: "#fff" };

let phaseDisplayEl;

function openModal() { document.getElementById('modalBg').style.display = "flex"; }
function closeModal() { document.getElementById('modalBg').style.display = "none"; }
function openCancelModal() { document.getElementById('cancelModalBg').style.display = "flex"; }
function closeCancelModal() { document.getElementById('cancelModalBg').style.display = "none"; }
function confirmCancelWorkout() { restartWorkout(); closeCancelModal(); }
function promptCancelWorkout() {
  if (!phaseDisplayEl) return;
  if (phaseDisplayEl.dataset.phaseState === "active") openCancelModal();
}

function applyPhaseStyle(key) {
  const style = PHASE_STYLE_MAP[key] || DEFAULT_PHASE_STYLE;
  const ring = document.getElementById('ringProgress');
  if (ring) ring.style.stroke = style.stroke;
  if (phaseDisplayEl) {
    phaseDisplayEl.style.background = style.background;
    phaseDisplayEl.style.color = style.text;
  }
}

function saveHRV() {
  const hrv = document.getElementById('hrvInput').value;
  if (!hrv) return;
  const key = "hrv_" + new Date().toDateString();
  localStorage.setItem(key, hrv);
  document.getElementById('hrvSection').style.display = "none";
  updateDisplay();
}

function updateDisplay() {
  const day = getSelectedDay();
  const plan = getPlan();
  const workoutMetadata = getWorkoutMetadata();
  const base = plan[day];

  // Format day display with workout type only (no machine)
  let dayText = day;
  if (base && workoutMetadata[day]) {
    const meta = workoutMetadata[day];
    if (meta.type) {
      dayText = day + ": " + meta.type;
    }
  }
  document.getElementById('dayDisplay').textContent = dayText;
  
  // Update activity icon based on machine type
  const activityIcon = document.getElementById('activityIcon');
  if (activityIcon && base && workoutMetadata[day]) {
    const machine = workoutMetadata[day].machine || "";
    let iconSrc = "";
    const machineLower = machine.toLowerCase();
    // Check for combo/strength first, then bike, then elliptical
    if (machineLower.includes("combo") || machineLower.includes("strength")) {
      iconSrc = "dumbbell.png";
    } else if (machineLower.includes("bike")) {
      iconSrc = "bike.png";
    } else if (machineLower.includes("elliptical")) {
      iconSrc = "elliptical.png";
    }
    if (iconSrc) {
      activityIcon.src = iconSrc;
      activityIcon.style.display = "block";
    } else {
      activityIcon.style.display = "none";
    }
  } else if (activityIcon) {
    activityIcon.style.display = "none";
  }

  const hrv = getTodayHRV();
  if (hrv) document.getElementById('hrvSection').style.display = "none";

  const hrTargetEl = document.getElementById('hrTarget');

  if (!base) {
    document.getElementById('workoutBlocks').textContent = "Rest Day";
    if (phaseDisplayEl) {
      phaseDisplayEl.innerHTML = '<span class="phase-name">Rest Day</span>';
      phaseDisplayEl.dataset.phaseState = "rest";
    }
    const activityIcon = document.getElementById('activityIcon');
    if (activityIcon) activityIcon.style.display = "none";
    document.getElementById('startButton').style.display = "none";
    updateRing(0, { warm: 1, sustain: 1, cool: 1 });
    hrTargetEl.textContent = "";
    updateHeartPulse("");
    applyPhaseStyle("Rest");
    return;
  }

  const blocks = adjustedBlockLengths(base, hrv);
  document.getElementById('workoutBlocks').textContent =
    "Warm-Up: " + blocks.warm + " min · Sustain: " + blocks.sustain + " min · Cool-Down: " + blocks.cool + " min";

  const start = getStartTime(day);
  let elapsedSec = 0;

  if (!start) {
    if (phaseDisplayEl) {
      phaseDisplayEl.innerHTML = '<span class="phase-name">Not Started</span>';
      phaseDisplayEl.dataset.phaseState = "idle";
    }
    document.getElementById('startButton').innerText = "Start Workout";
    document.getElementById('startButton').onclick = startWorkout;
    document.getElementById('startButton').style.display = "block";
    updateRing(0, blocks);
    hrTargetEl.textContent = "";
    updateHeartPulse("");
    applyPhaseStyle("idle");
    return;
  }

  elapsedSec = Math.floor((Date.now() - start) / 1000);
  const phase = getPhase(elapsedSec, blocks);

  updateRing(elapsedSec, blocks);

  if (phase.done) {
    if (phaseDisplayEl) {
      phaseDisplayEl.innerHTML = '<span class="phase-name">Completed</span>';
      phaseDisplayEl.dataset.phaseState = "completed";
    }
    document.getElementById('startButton').innerText = "Restart Workout";
    document.getElementById('startButton').onclick = restartWorkout;
    document.getElementById('startButton').style.display = "block";
    hrTargetEl.textContent = "";
    updateHeartPulse("");
    applyPhaseStyle("completed");
    return;
  }

  document.getElementById('startButton').style.display = "none";
  
  // Get phase name, including warmup subsection if applicable
  let phaseDisplayName = phase.phase;
  if (phase.phase === "Warm-Up") {
    const subsectionName = getWarmupSubsectionName(day, elapsedSec);
    if (subsectionName) {
      phaseDisplayName = "Warm-Up (" + subsectionName + ")";
    }
  }
  
  if (phaseDisplayEl) {
    phaseDisplayEl.innerHTML = '<span class="phase-name">' + phaseDisplayName + '</span><span class="phase-time">' + formatTime(phase.timeLeft) + '</span>';
    phaseDisplayEl.dataset.phaseState = "active";
  }

  const hrTargetTextValue = hrTargetText(phase.phase, day, elapsedSec, blocks);
  hrTargetEl.textContent = hrTargetTextValue;
  
  // Update heart pulsation rate based on target HR
  updateHeartPulse(hrTargetTextValue);
  
  applyPhaseStyle(phase.phase);
}

// Get warmup subsection name for display in phase box
function getWarmupSubsectionName(day, elapsedSec) {
  const hrTargets = getHrTargets();
  const dayHrTargets = hrTargets[day];
  if (!dayHrTargets || !dayHrTargets.warmup_subsections) {
    return null;
  }
  
  // Find which warmup sub-section we're in
  for (let i = 0; i < dayHrTargets.warmup_subsections.length; i++) {
    const subsection = dayHrTargets.warmup_subsections[i];
    const startSec = subsection.start_min * 60;
    const endSec = subsection.end_min * 60;
    
    if (elapsedSec >= startSec && elapsedSec < endSec) {
      return subsection.name;
    }
  }
  
  return null;
}

// Extract lower HR value from target string and update heart animation
function updateHeartPulse(hrTargetText) {
  const heartIcon = document.getElementById('heartIcon');
  if (!heartIcon) return;
  
  if (!hrTargetText || hrTargetText === "") {
    // No target HR - stop animation
    heartIcon.style.setProperty('animation', 'none', 'important');
    return;
  }
  
  // Extract the lower number from strings like "155–165 bpm" or "<120 bpm"
  let hrValue = null;
  
  // Try to match patterns like "155–165" or "<120" or "120"
  const rangeMatch = hrTargetText.match(/(\d+)[–-](\d+)/);
  const lessThanMatch = hrTargetText.match(/<(\d+)/);
  const singleMatch = hrTargetText.match(/(\d+)/);
  
  if (rangeMatch) {
    // Range like "155–165" - use the lower value
    hrValue = parseInt(rangeMatch[1]);
  } else if (lessThanMatch) {
    // Less than like "<120" - use that value
    hrValue = parseInt(lessThanMatch[1]);
  } else if (singleMatch) {
    // Single number
    hrValue = parseInt(singleMatch[1]);
  }
  
  if (hrValue && hrValue > 0) {
    // Calculate animation duration: 60 seconds / bpm = seconds per beat
    const duration = 60 / hrValue;
    // Use different animation name for mobile vs desktop
    const isMobile = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    const animationName = isMobile ? 'heartPulseMobile' : 'heartPulse';
    // Use !important to override any CSS rules
    heartIcon.style.setProperty('animation', `${animationName} ${duration}s ease-in-out infinite`, 'important');
    console.log('Setting heart animation:', animationName, duration, 's for', hrValue, 'bpm');
  } else {
    // Invalid or no HR value - stop animation
    heartIcon.style.setProperty('animation', 'none', 'important');
    console.log('No valid HR value found in:', hrTargetText);
  }
}

