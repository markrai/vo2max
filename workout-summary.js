// Workout summary generation and emission
// Generate stable UUID (v4)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Format ISO-8601 UTC timestamp
function formatISO8601UTC(timestamp) {
  return new Date(timestamp).toISOString();
}

// Build HR trace with 60-second sampling interval
function buildHrTrace(hrSamples) {
  if (!hrSamples || hrSamples.length === 0) {
    return {
      sampling_interval_seconds: 60,
      samples: []
    };
  }

  // Sort samples by timestamp
  const sortedSamples = [...hrSamples].sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  // Downsample to 60-second intervals
  const downsampled = [];
  const interval = 60; // 60 seconds

  for (let t = 0; t <= sortedSamples[sortedSamples.length - 1].timestamp_sec; t += interval) {
    // Find sample closest to this timestamp
    let closestSample = null;
    let minDiff = Infinity;

    for (const sample of sortedSamples) {
      const diff = Math.abs(sample.timestamp_sec - t);
      if (diff < minDiff) {
        minDiff = diff;
        closestSample = sample;
      }
    }

    if (closestSample && closestSample.hr && closestSample.hr > 0) {
      downsampled.push({
        t: t,
        hr: closestSample.hr
      });
    }
  }

  return {
    sampling_interval_seconds: 60,
    samples: downsampled
  };
}

// Determine stress profile from primary zone
function determineStressProfile(primaryZone) {
  if (primaryZone === 1 || primaryZone === 2) {
    return 'low';
  } else if (primaryZone === 3) {
    return 'moderate';
  } else if (primaryZone === 4 || primaryZone === 5) {
    return 'high';
  }
  // Default fallback
  return 'low';
}

// Validate workout summary invariants
function validateSummary(summary) {
  const errors = [];

  // Check duration_minutes = rounded total seconds / 60
  const totalSeconds = Math.floor((new Date(summary.endedAt) - new Date(summary.startedAt)) / 1000);
  const expectedDuration = Math.round(totalSeconds / 60);
  if (summary.duration_minutes !== expectedDuration) {
    errors.push(`duration_minutes mismatch: expected ${expectedDuration}, got ${summary.duration_minutes}`);
  }

  // Check sum of zone_minutes equals duration_minutes
  const zoneSum = summary.zone_minutes.z1 + summary.zone_minutes.z2 + 
                   summary.zone_minutes.z3 + summary.zone_minutes.z4 + 
                   summary.zone_minutes.z5;
  if (zoneSum !== summary.duration_minutes) {
    errors.push(`zone_minutes sum (${zoneSum}) does not equal duration_minutes (${summary.duration_minutes})`);
  }

  // Check primary_zone is in zone_minutes with value > 0
  const primaryZoneKey = `z${summary.primary_zone}`;
  if (summary.zone_minutes[primaryZoneKey] === undefined || summary.zone_minutes[primaryZoneKey] <= 0) {
    errors.push(`primary_zone ${summary.primary_zone} has zero or negative minutes in zone_minutes`);
  }

  // Check startedAt < endedAt
  if (new Date(summary.startedAt) >= new Date(summary.endedAt)) {
    errors.push(`startedAt (${summary.startedAt}) must be before endedAt (${summary.endedAt})`);
  }

  // Check JSON validity
  try {
    JSON.stringify(summary);
  } catch (e) {
    errors.push(`Invalid JSON: ${e.message}`);
  }

  return errors;
}

// Generate workout summary
async function generateWorkoutSummary(sessionId, startedAt, endedAt, day) {
  // Get HR samples
  const hrSamples = await window.getHrSamples(sessionId);

  // Calculate zone minutes
  const zoneMinutes = window.calculateZoneMinutes(hrSamples);

  // Determine primary zone
  const primaryZone = window.determinePrimaryZone(zoneMinutes);

  // Determine stress profile
  const stressProfile = determineStressProfile(primaryZone);

  // Build HR trace
  const hrTrace = buildHrTrace(hrSamples);

  // Calculate duration
  const totalSeconds = Math.floor((endedAt - startedAt) / 1000);
  const durationMinutes = Math.round(totalSeconds / 60);

  // Get intent from workout metadata
  let intent = 'unknown';
  if (typeof getWorkoutMetadata === 'function') {
    const metadata = getWorkoutMetadata();
    if (metadata && metadata[day] && metadata[day].type) {
      intent = metadata[day].type;
    }
  }

  // Build summary
  const summary = {
    external_session_id: sessionId,
    startedAt: formatISO8601UTC(startedAt),
    endedAt: formatISO8601UTC(endedAt),
    category: 'cardio',
    intent: intent,
    duration_minutes: durationMinutes,
    primary_zone: primaryZone,
    stress_profile: stressProfile,
    zone_minutes: zoneMinutes,
    hr_trace: hrTrace,
    day: day // Store day for IndexedDB indexing
  };

  // Validate invariants
  const errors = validateSummary(summary);
  if (errors.length > 0) {
    console.error('Workout summary validation errors:', errors);
    // Fix zone_minutes sum if it doesn't match duration_minutes
    // This can happen due to rounding
    const zoneSum = summary.zone_minutes.z1 + summary.zone_minutes.z2 + 
                     summary.zone_minutes.z3 + summary.zone_minutes.z4 + 
                     summary.zone_minutes.z5;
    if (zoneSum !== summary.duration_minutes) {
      // Adjust the primary zone's minutes to make sum match
      const diff = summary.duration_minutes - zoneSum;
      const primaryZoneKey = `z${summary.primary_zone}`;
      summary.zone_minutes[primaryZoneKey] = Math.max(0, summary.zone_minutes[primaryZoneKey] + diff);
    }
  }

  return summary;
}

// Emit workout summary (modal + IndexedDB)
async function emitWorkoutSummary(summary) {
  // Create a copy without the 'day' field for emission
  const summaryForEmission = { ...summary };
  delete summaryForEmission.day;
  
  // Store in IndexedDB (with day field for indexing)
  await window.storeWorkoutSummary(summary);
  
  // Show modal with summary
  if (typeof window.showWorkoutSummaryModal === 'function') {
    window.showWorkoutSummaryModal(summaryForEmission);
  }
}

// Expose functions globally
window.generateUUID = generateUUID;
window.generateWorkoutSummary = generateWorkoutSummary;
window.emitWorkoutSummary = emitWorkoutSummary;
