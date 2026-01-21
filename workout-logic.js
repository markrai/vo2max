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
  const startTime = Date.now();
  localStorage.setItem(key, startTime);
  
  // Initialize workout session
  if (typeof window.generateUUID === 'function') {
    const sessionId = window.generateUUID();
    localStorage.setItem("session_id_" + day, sessionId);
    localStorage.setItem("session_start_" + day, startTime);
    localStorage.setItem("summary_emitted_" + day, "false");
    
    // Initialize IndexedDB
    if (typeof window.initDB === 'function') {
      window.initDB().catch(err => console.error('Failed to init DB:', err));
    }
  }
  
  // Activate wake lock to keep screen awake during workout
  if (typeof window.requestWakeLock === 'function') {
    window.requestWakeLock();
  }
  
  if (typeof updateDisplay === 'function') updateDisplay();
}

async function restartWorkout() {
  // Get selected day from ui-controls.js if available, otherwise use today
  const day = (typeof getSelectedDay === 'function') ? getSelectedDay() : todayName();
  const key = "start_" + day;
  const startTime = localStorage.getItem(key);
  
  // Get session info before clearing
  const sessionId = localStorage.getItem("session_id_" + day);
  const sessionStart = localStorage.getItem("session_start_" + day);
  const summaryEmitted = localStorage.getItem("summary_emitted_" + day);
  
  // Emit summary if workout was active (aborted workout)
  // Check for stale sessions (older than 24 hours) and skip them
  if (startTime && sessionId && sessionStart && summaryEmitted === "false" && typeof window.generateWorkoutSummary === 'function') {
    const sessionStartTime = parseInt(sessionStart);
    const sessionAge = Date.now() - sessionStartTime;
    const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > MAX_SESSION_AGE_MS) {
      console.warn(`Skipping stale workout session for ${day} (age: ${Math.round(sessionAge / (1000 * 60 * 60))} hours)`);
      // Clean up stale session without generating summary
    } else {
      const endedAt = Date.now();
      try {
        const summary = await window.generateWorkoutSummary(sessionId, sessionStartTime, endedAt, day);
        await window.emitWorkoutSummary(summary);
      } catch (error) {
        console.error('Error emitting workout summary on cancel:', error);
        // If error is due to duration validation, clean up the stale session
        if (error.message && error.message.includes('exceeds maximum')) {
          console.warn('Stale session detected, cleaning up...');
        }
      }
    }
  }
  
  // Release wake lock
  if (typeof window.releaseWakeLock === 'function') {
    await window.releaseWakeLock();
  }
  
  // Clear workout state
  localStorage.removeItem(key);
  localStorage.removeItem("session_id_" + day);
  localStorage.removeItem("session_start_" + day);
  localStorage.removeItem("summary_emitted_" + day);
  
  // Clear HR samples for this session (optional cleanup)
  if (sessionId && typeof window.clearHrSamples === 'function') {
    await window.clearHrSamples(sessionId).catch(err => console.error('Error clearing HR samples:', err));
  }
  
  if (typeof updateDisplay === 'function') updateDisplay();
}

function getPhase(elapsedSec, blocks) {
  const w = blocks.warm * 60;
  const s = blocks.sustain * 60;
  const c = blocks.cool * 60;

  if (elapsedSec < w) return { phase: "Warm-Up", timeLeft: w - elapsedSec, done: false };
  if (elapsedSec < w + s) {
    // For interval workouts, calculate time left in current interval phase
    const day = (typeof getSelectedDay === 'function') ? getSelectedDay() : todayName();
    const hrTargets = (typeof getHrTargets === 'function') ? getHrTargets() : {};
    const dayHrTargets = hrTargets[day];
    
    if (dayHrTargets && dayHrTargets.intervals && dayHrTargets.intervals.phases) {
      const warmSec = blocks.warm * 60;
      const sustainElapsed = Math.max(0, elapsedSec - warmSec);
      const phases = dayHrTargets.intervals.phases;
      const isSequence = dayHrTargets.intervals.isSequence;
      
      let elapsedInPhases = sustainElapsed;
      
      if (isSequence) {
        const totalDuration = phases.reduce((sum, p) => sum + p.duration * 60, 0);
        elapsedInPhases = Math.min(sustainElapsed, totalDuration);
      } else {
        const cycleDuration = phases.reduce((sum, p) => sum + p.duration * 60, 0);
        elapsedInPhases = sustainElapsed % cycleDuration;
      }
      
      let accumulated = 0;
      for (let i = 0; i < phases.length; i++) {
        const phaseDuration = phases[i].duration * 60;
        if (elapsedInPhases < accumulated + phaseDuration) {
          const timeLeftInPhase = (accumulated + phaseDuration) - elapsedInPhases;
          return { phase: "Sustain", timeLeft: timeLeftInPhase, done: false };
        }
        accumulated += phaseDuration;
      }
    }
    
    // Fallback to total sustain time for non-interval workouts
    return { phase: "Sustain", timeLeft: (w + s) - elapsedSec, done: false };
  }
  if (elapsedSec < w + s + c) return { phase: "Cool-Down", timeLeft: (w + s + c) - elapsedSec, done: false };

  return { phase: "Completed", timeLeft: 0, done: true };
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + "m " + s + "s";
}

// HRV functions - reserved for future SISU sync integration
// getTodayHRV() and adjustedBlockLengths() will be implemented via SISU API
function getTodayHRV() {
  // Future: Get HRV from SISU sync
  // For now, return null to use base workout plan
  return null;
}

function adjustedBlockLengths(base, hrv) {
  // Future: Adjust based on HRV baseline from SISU
  // For now, return base workout plan without adjustments
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

function initiateHrConnection() {
  navigator.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })
  .then(device => {
    return device.gatt.connect();
  })
  .then(server => {
    return server.getPrimaryService('heart_rate');
  })
  .then(service => {
    return service.getCharacteristic('heart_rate_measurement');
  })
  .then(characteristic => {
    return characteristic.startNotifications();
  })
  .then(characteristic => {
    characteristic.addEventListener('characteristicvaluechanged',
                                    handleCharacteristicValueChanged);
  })
  .catch(error => {
    console.error(error);
  });
}

function parseHrValue(value) {
  value = value.buffer ? value : new DataView(value);
  let flags = value.getUint8(0);
  let rate16Bits = flags & 0x1;
  let result = {};
  let index = 1;
  if (rate16Bits) {
    result.heartRate = value.getUint16(index, true);
    index += 2;
  } else {
    result.heartRate = value.getUint8(index);
    index += 1;
  }
  return result.heartRate;
}

function handleCharacteristicValueChanged(event) {
  let hr = parseHrValue(event.target.value);
  updateHrDisplay(hr);
  
  // Store live BPM and update timestamp
  if (typeof window !== 'undefined') {
    window.liveBpm = hr;
    window.lastBpmUpdateTime = Date.now();
    
    // Update heart animation with live BPM
    if (typeof window.updateHeartPulse === 'function') {
      window.updateHeartPulse(hr);
    }
    
    // Update heart color based on current target range
    const hrTargetEl = document.getElementById('hrTarget');
    if (hrTargetEl && typeof window.updateHeartColor === 'function') {
      window.updateHeartColor(hr, hrTargetEl.textContent);
    }
    
    // Store HR sample if workout is active
    const day = (typeof getSelectedDay === 'function') ? getSelectedDay() : todayName();
    const startTime = getStartTime(day);
    if (startTime && typeof window.storeHrSample === 'function') {
      const sessionId = localStorage.getItem("session_id_" + day);
      if (sessionId) {
        const elapsedSec = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        window.storeHrSample(sessionId, elapsedSec, hr).catch(err => {
          console.error('Error storing HR sample:', err);
        });
      }
    }
  }
}

window.initiateHrConnection = initiateHrConnection;

