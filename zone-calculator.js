// Zone calculation and mapping functions
// Zone definitions:
// Zone 1: ≤ 110 bpm
// Zone 2: 115-130 bpm
// Zone 3: 131-145 bpm
// Zone 4: 155-162 bpm
// Zone 5: 165-175 bpm
// Zone 6: ≥ 175 bpm (mapped to Zone 5 for output)

// Map HR value to zone (1-5, with 6 mapped to 5)
function mapHrToZone(hr) {
  if (hr <= 110) {
    return 1;
  } else if (hr >= 115 && hr <= 130) {
    return 2;
  } else if (hr >= 131 && hr <= 145) {
    return 3;
  } else if (hr >= 155 && hr <= 162) {
    return 4;
  } else if (hr >= 165 && hr <= 175) {
    return 5;
  } else if (hr > 175) {
    // Zone 6 (> 175) maps to Zone 5 for output
    return 5;
  } else {
    // Handle gaps: 111-114, 146-154, 163-164
    // Map to nearest zone
    if (hr >= 111 && hr <= 114) {
      return 2; // Closer to Zone 2
    } else if (hr >= 146 && hr <= 154) {
      return 3; // Closer to Zone 3
    } else if (hr >= 163 && hr <= 164) {
      return 4; // Closer to Zone 4
    }
    // Fallback (shouldn't happen with valid HR data)
    return 1;
  }
}

// Calculate zone minutes from HR samples
// HR samples should be array of {timestamp_sec, hr}
function calculateZoneMinutes(hrSamples) {
  const zoneMinutes = {
    z1: 0,
    z2: 0,
    z3: 0,
    z4: 0,
    z5: 0
  };

  if (!hrSamples || hrSamples.length === 0) {
    return zoneMinutes;
  }

  // Sort samples by timestamp
  const sortedSamples = [...hrSamples].sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  // Track time spent in each zone
  // Since we have second-by-second data, we count seconds per zone
  const zoneSeconds = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  // Process each sample
  // Each sample represents 1 second
  for (let i = 0; i < sortedSamples.length; i++) {
    const sample = sortedSamples[i];
    if (sample.hr && sample.hr > 0) {
      const zone = mapHrToZone(sample.hr);
      zoneSeconds[zone]++;
    }
  }

  // Convert seconds to minutes (rounded)
  // Use Math.round to handle partial minutes correctly
  zoneMinutes.z1 = Math.round(zoneSeconds[1] / 60);
  zoneMinutes.z2 = Math.round(zoneSeconds[2] / 60);
  zoneMinutes.z3 = Math.round(zoneSeconds[3] / 60);
  zoneMinutes.z4 = Math.round(zoneSeconds[4] / 60);
  zoneMinutes.z5 = Math.round(zoneSeconds[5] / 60);

  return zoneMinutes;
}

// Determine primary zone (zone with most time spent)
function determinePrimaryZone(zoneMinutes) {
  let maxMinutes = 0;
  let primaryZone = 1;

  if (zoneMinutes.z5 > maxMinutes) {
    maxMinutes = zoneMinutes.z5;
    primaryZone = 5;
  }
  if (zoneMinutes.z4 > maxMinutes) {
    maxMinutes = zoneMinutes.z4;
    primaryZone = 4;
  }
  if (zoneMinutes.z3 > maxMinutes) {
    maxMinutes = zoneMinutes.z3;
    primaryZone = 3;
  }
  if (zoneMinutes.z2 > maxMinutes) {
    maxMinutes = zoneMinutes.z2;
    primaryZone = 2;
  }
  if (zoneMinutes.z1 > maxMinutes) {
    maxMinutes = zoneMinutes.z1;
    primaryZone = 1;
  }

  // If all zones are 0, default to zone 1
  if (maxMinutes === 0) {
    return 1;
  }

  return primaryZone;
}

// Expose functions globally
window.mapHrToZone = mapHrToZone;
window.calculateZoneMinutes = calculateZoneMinutes;
window.determinePrimaryZone = determinePrimaryZone;
