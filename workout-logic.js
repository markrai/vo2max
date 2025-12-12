// Workout timing and phase calculations
function todayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getStartTime(day) {
  const dayToUse = day || todayName();
  return localStorage.getItem("start_" + dayToUse);
}

function startWorkout() {
  // Get selected day from ui-controls.js if available, otherwise use today
  const day = (typeof getSelectedDay === 'function') ? getSelectedDay() : todayName();
  const key = "start_" + day;
  localStorage.setItem(key, Date.now());
  if (typeof updateDisplay === 'function') updateDisplay();
}

function restartWorkout() {
  // Get selected day from ui-controls.js if available, otherwise use today
  const day = (typeof getSelectedDay === 'function') ? getSelectedDay() : todayName();
  const key = "start_" + day;
  localStorage.removeItem(key);
  if (typeof updateDisplay === 'function') updateDisplay();
}

function getPhase(elapsedSec, blocks) {
  const w = blocks.warm * 60;
  const s = blocks.sustain * 60;
  const c = blocks.cool * 60;

  if (elapsedSec < w) return { phase: "Warm-Up", timeLeft: w - elapsedSec, done: false };
  if (elapsedSec < w + s) return { phase: "Sustain", timeLeft: (w + s) - elapsedSec, done: false };
  if (elapsedSec < w + s + c) return { phase: "Cool-Down", timeLeft: (w + s + c) - elapsedSec, done: false };

  return { phase: "Completed", timeLeft: 0, done: true };
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + "m " + s + "s";
}

function getTodayHRV() {
  const key = "hrv_" + new Date().toDateString();
  return localStorage.getItem(key);
}

function adjustedBlockLengths(base, hrv) {
  if (!hrv) return base;
  if (hrv < 40) return { warm: base.warm + 3, sustain: Math.max(10, base.sustain - 5), cool: base.cool + 2 };
  if (hrv > 60) return { warm: base.warm, sustain: base.sustain + 5, cool: base.cool };
  return base;
}

// Ring animation constants and functions
const RING_CIRC = 339.292;
const RING_CIRC_LANDSCAPE = 407.1504; // 20% increase for landscape

function getRingCircumference() {
  return window.matchMedia("(orientation: landscape)").matches ? RING_CIRC_LANDSCAPE : RING_CIRC;
}

function updateRing(elapsedSec, blocks) {
  const el = document.getElementById('ringProgress');
  const center = document.getElementById('ringCenterText');
  if (!el || !blocks) return;

  const totalSec = (blocks.warm + blocks.sustain + blocks.cool) * 60;
  if (totalSec <= 0) return;
  
  // Cap elapsed time to total duration to prevent showing as completed during cooldown
  const cappedElapsed = Math.max(0, Math.min(elapsedSec, totalSec));
  const progress = cappedElapsed / totalSec;
  const ringCirc = getRingCircumference();
  const offset = ringCirc * (1 - progress);
  
  el.style.strokeDasharray = ringCirc;
  el.style.strokeDashoffset = offset;

  const remaining = totalSec - cappedElapsed;
  center.textContent = formatTime(remaining);
}

// HR target text generation
function hrTargetText(phaseName, day, elapsedSec, blocks) {
  const hrTargets = getHrTargets();
  const dayHrTargets = hrTargets[day];
  if (!dayHrTargets) return "";
  
  if (phaseName === "Warm-Up") {
    // Check for warmup sub-sections (like Friday's 4x4 intervals)
    if (dayHrTargets.warmup_subsections && Array.isArray(dayHrTargets.warmup_subsections)) {
      // During warm-up phase, elapsedSec is the time since workout start
      // Find which warmup sub-section we're in
      for (let i = 0; i < dayHrTargets.warmup_subsections.length; i++) {
        const subsection = dayHrTargets.warmup_subsections[i];
        const startSec = subsection.start_min * 60;
        const endSec = subsection.end_min * 60;
        
        if (elapsedSec >= startSec && elapsedSec < endSec) {
          return subsection.target_hr_bpm + " bpm";
        }
      }
    }
    // Fallback to general warmup HR target
    if (dayHrTargets.warmup) {
      return dayHrTargets.warmup + " bpm";
    }
  } else if (phaseName === "Cool-Down") {
    if (dayHrTargets.cooldown) {
      return dayHrTargets.cooldown + " bpm";
    }
  } else if (phaseName === "Sustain") {
    // For interval workouts, determine which interval phase we're in
    if (dayHrTargets.intervals && dayHrTargets.intervals.phases) {
      const warmSec = blocks.warm * 60;
      const sustainElapsed = Math.max(0, elapsedSec - warmSec);
      
      // Find which interval phase we're in
      const phases = dayHrTargets.intervals.phases;
      const isSequence = dayHrTargets.intervals.isSequence;
      
      let elapsedInPhases = sustainElapsed;
      
      if (isSequence) {
        // For sequences (like Friday), go through all phases once
        const totalDuration = phases.reduce((sum, p) => sum + p.duration * 60, 0);
        elapsedInPhases = Math.min(sustainElapsed, totalDuration);
      } else {
        // For repeating patterns (like Monday), cycle through the phases
        const cycleDuration = phases.reduce((sum, p) => sum + p.duration * 60, 0);
        elapsedInPhases = sustainElapsed % cycleDuration;
      }
      
      let accumulated = 0;
      for (let i = 0; i < phases.length; i++) {
        const phaseDuration = phases[i].duration * 60;
        if (elapsedInPhases < accumulated + phaseDuration) {
          if (phases[i].target_hr_bpm) {
            return phases[i].target_hr_bpm + " bpm";
          }
          break;
        }
        accumulated += phaseDuration;
      }
    } else if (dayHrTargets.main_set) {
      // Simple sustain phase with single HR target
      return dayHrTargets.main_set + " bpm";
    }
  }
  
  return "";
}

