// SISU Sync - REST endpoint integration for workout sync and HRV baseline

// SISU connection state
let sisuConnectionState = {
  connected: false,
  lastSync: null,
  hrvBaseline: null,
  syncError: null,
  host: null,
  port: null
};

/**
 * Load SISU settings from IndexedDB
 */
async function loadSisuSettings() {
  try {
    const settings = await window.getSisuSettings();
    if (settings) {
      sisuConnectionState.host = settings.host;
      sisuConnectionState.port = settings.port;
      
      // Populate input fields (clean host value)
      const hostInput = document.getElementById('sisuHost');
      const portInput = document.getElementById('sisuPort');
      if (hostInput) {
        // Clean host: remove protocol, trailing colons
        let host = settings.host;
        host = host.replace(/^https?:\/\//, ''); // Remove http:// or https://
        host = host.replace(/:\d+$/, ''); // Remove trailing :port
        host = host.replace(/\/$/, ''); // Remove trailing slash
        host = host.replace(/:$/, ''); // Remove trailing colon
        hostInput.value = host;
      }
      if (portInput) portInput.value = settings.port;
      
      // Test connection and update status (use cleaned host)
      const cleanedHost = settings.host.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/$/, '').replace(/:$/, '');
      const isConnected = await testSisuConnection(cleanedHost, settings.port);
      updateSISUStatus(isConnected ? `Connected to ${settings.host}:${settings.port}` : 'Settings saved but not connected', isConnected);
      return settings;
    } else {
      // No settings found - ensure status is set to default
      updateSISUStatus('Not connected', false);
      return null;
    }
  } catch (error) {
    console.error('Error loading SISU settings:', error);
    updateSISUStatus('Error loading settings', false);
    return null;
  }
}

/**
 * Get the protocol to use for SISU connections
 * Auto-detects based on current page protocol to avoid mixed content issues
 */
function getSisuProtocol() {
  // If VO2 app is served over HTTPS, use HTTPS for SISU (or browser will block)
  // If VO2 app is served over HTTP, use HTTP for SISU
  return window.location.protocol === 'https:' ? 'https' : 'http';
}

function cleanHostForUrl(host) {
  if (!host) return host;
  return String(host)
    .trim()
    .replace(/^https?:\/\//, '') // Remove protocol if user pasted it
    .replace(/:\d+$/, '') // Remove trailing :port
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/:$/, ''); // Remove trailing colon
}

/**
 * Test connection to SISU health endpoint
 */
async function testSisuConnection(host, port) {
  try {
    // Auto-detect protocol based on current page to avoid mixed content
    const cleanedHost = cleanHostForUrl(host);
    const protocol = getSisuProtocol();
    const url = `${protocol}://${cleanedHost}:${port}/health`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // Explicitly enable CORS
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch (error) {
    console.error('SISU connection test error:', error);
    return false;
  }
}

/**
 * Initialize SISU sync connection
 */
async function connectSISU() {
  const hostInput = document.getElementById('sisuHost');
  const portInput = document.getElementById('sisuPort');
  
  if (!hostInput || !portInput) {
    updateSISUStatus('Input fields not found', false);
    return;
  }
  
  // Clean host: remove protocol, trailing colons, and whitespace
  const host = cleanHostForUrl(hostInput.value);
  
  const port = parseInt(portInput.value, 10);
  
  if (!host || !port || isNaN(port)) {
    updateSISUStatus('Please enter valid host and port', false);
    return;
  }

  // Guardrail: users often accidentally paste the VO2 host instead of the SISU host.
  // If you point at VO2, you’ll get confusing 503/404 errors from the wrong service.
  const currentHost = window.location.hostname;
  if (host === currentHost || (host.includes('vo2') && !host.includes('sisu'))) {
    updateSISUStatus(`That looks like the VO2 host (${host}). Enter your SISU host (e.g. sisu.int.oyehoy.net).`, false);
    return;
  }
  
  try {
    // Test connection
    const protocol = getSisuProtocol();
    updateSISUStatus(`Testing ${protocol}://${host}:${port}/health ...`, false);
    const isConnected = await testSisuConnection(host, port);
    
    if (isConnected) {
      // Store settings
      const stored = await window.storeSisuSettings(host, port);
      if (stored) {
        sisuConnectionState.host = host;
        sisuConnectionState.port = port;
        sisuConnectionState.connected = true;
        updateSISUStatus(`Connected to ${host}:${port}`, true);
        
        // Show connection info
        const infoEl = document.getElementById('sisuConnectionInfo');
        if (infoEl) {
          infoEl.textContent = `Connected to ${host}:${port}`;
          infoEl.style.display = 'block';
        }
      } else {
        updateSISUStatus('Connection successful but failed to save settings', false);
      }
    } else {
      updateSISUStatus('Connection failed - check host and port', false);
    }
  } catch (error) {
    console.error('SISU connection error:', error);
    updateSISUStatus('Connection failed: ' + error.message, false);
  }
}

/**
 * Sync HRV baseline from SISU
 * Future: Fetch user's HRV baseline from SISU REST endpoint
 */
async function syncHRVBaseline() {
  if (!sisuConnectionState.connected) {
    return null;
  }

  try {
    // TODO: Implement REST endpoint call
    // const response = await fetch(`${SISU_CONFIG.apiEndpoint}/hrv/baseline`, {
    //   headers: { 'Authorization': `Bearer ${SISU_CONFIG.apiKey}` }
    // });
    // const data = await response.json();
    // sisuConnectionState.hrvBaseline = data.baseline;
    // return data.baseline;
    
    // Placeholder
    return null;
  } catch (error) {
    console.error('HRV baseline sync error:', error);
    sisuConnectionState.syncError = error.message;
    return null;
  }
}

/**
 * Get today's HRV from SISU
 * Future: Fetch today's HRV reading from SISU REST endpoint
 */
async function getTodayHRVFromSISU() {
  if (!sisuConnectionState.connected) {
    return null;
  }

  try {
    // TODO: Implement REST endpoint call
    // const response = await fetch(`${SISU_CONFIG.apiEndpoint}/hrv/today`, {
    //   headers: { 'Authorization': `Bearer ${SISU_CONFIG.apiKey}` }
    // });
    // const data = await response.json();
    // return data.hrv;
    
    // Placeholder
    return null;
  } catch (error) {
    console.error('Get today HRV error:', error);
    return null;
  }
}

/**
 * Adjust workout blocks based on HRV baseline and today's HRV
 * Future: Calculate adjustments using SISU-provided baseline
 */
function adjustedBlockLengthsFromSISU(base, todayHRV, baselineHRV) {
  if (!todayHRV || !baselineHRV) {
    return base;
  }

  // TODO: Implement adjustment logic based on deviation from baseline
  // Example approach:
  // const deviation = ((todayHRV - baselineHRV) / baselineHRV) * 100;
  // if (deviation < -15) {
  //   return { warm: base.warm + 3, sustain: Math.max(10, base.sustain - 5), cool: base.cool + 2 };
  // }
  // if (deviation > 15) {
  //   return { warm: base.warm, sustain: base.sustain + 5, cool: base.cool };
  // }
  
  // Placeholder - return base for now
  return base;
}

/**
 * Update SISU connection status in UI
 */
function updateSISUStatus(message, connected) {
  const statusEl = document.getElementById('sisuStatus');
  const buttonEl = document.getElementById('sisuConnectButton');
  
  if (statusEl) {
    statusEl.textContent = message || (connected ? 'Connected' : 'Not connected');
    statusEl.style.color = connected ? '#3d7cff' : '#888';
  }
  
  if (buttonEl) {
    buttonEl.textContent = connected ? 'Disconnect from SISU' : 'Connect to SISU';
    buttonEl.onclick = connected ? disconnectSISU : connectSISU;
  }
  
  sisuConnectionState.connected = connected;
  sisuConnectionState.lastSync = connected ? new Date() : null;
}

/**
 * Disconnect from SISU
 */
async function disconnectSISU() {
  await window.clearSisuSettings();
  sisuConnectionState.connected = false;
  sisuConnectionState.host = null;
  sisuConnectionState.port = null;
  sisuConnectionState.hrvBaseline = null;
  sisuConnectionState.syncError = null;
  
  // Clear input fields
  const hostInput = document.getElementById('sisuHost');
  const portInput = document.getElementById('sisuPort');
  if (hostInput) hostInput.value = '';
  if (portInput) portInput.value = '';
  
  // Hide connection info
  const infoEl = document.getElementById('sisuConnectionInfo');
  if (infoEl) {
    infoEl.style.display = 'none';
  }
  
  updateSISUStatus('Disconnected', false);
}

/**
 * Periodic sync with SISU
 * Future: Implement automatic periodic syncing
 */
async function syncWithSISU() {
  if (!sisuConnectionState.connected) {
    return;
  }

  try {
    await syncHRVBaseline();
    // TODO: Implement other sync operations
    sisuConnectionState.lastSync = new Date();
  } catch (error) {
    console.error('SISU sync error:', error);
    sisuConnectionState.syncError = error.message;
  }
}

/**
 * Send workout summary to SISU
 */
async function sendWorkoutToSisu(sessionId) {
  try {
    // Get SISU settings
    const settings = await window.getSisuSettings();
    if (!settings || !settings.host || !settings.port) {
      return { success: false, message: 'SISU not configured. Please connect in Settings > Sync tab.' };
    }
    
    // Get workout summary from IndexedDB
    const database = await window.initDB();
    const transaction = database.transaction(['workouts'], 'readonly');
    const store = transaction.objectStore('workouts');
    
    const workoutData = await new Promise((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!workoutData || !workoutData.summary) {
      return { success: false, message: 'Workout not found' };
    }
    
    const summary = workoutData.summary;
    
    // Build payload for SISU.
    // NOTE: `day` is optional in SISU (it's not used by the ingest route).
    // If `day` is missing, it means the workout was stored without it (data integrity issue),
    // but we don't assume "today" since users may log workouts for previous days.
    const payload = { ...summary };
    // Only include `day` if it's a valid non-empty string
    if (typeof payload.day !== 'string' || payload.day.trim() === '') {
      delete payload.day; // Remove invalid/empty day - SISU accepts optional day
    }
    
    // POST to SISU (auto-detect protocol to match current page)
    // Clean host to ensure no protocol prefix (defensive programming)
    const cleanedHost = cleanHostForUrl(settings.host);
    const protocol = getSisuProtocol();
    const url = `${protocol}://${cleanedHost}:${settings.port}/workout/ingest`;
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors', // Explicitly enable CORS
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update last sync time
      await window.storeSisuSettings(settings.host, settings.port);
      return { success: true, message: `Workout sent to SISU (Load: ${data.acuteLoadPoints} points)` };
    } else {
      const errorText = await response.text();
      let errorMessage = `SISU error (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    console.error('Error sending workout to SISU:', error);
    if (error.name === 'AbortError') {
      return { success: false, message: 'Connection timeout - check SISU server' };
    }
    return { success: false, message: 'Network error: ' + error.message };
  }
}

// Expose functions to window for global access
window.connectSISU = connectSISU;
window.disconnectSISU = disconnectSISU;
window.updateSISUStatus = updateSISUStatus;
window.syncWithSISU = syncWithSISU;
window.getTodayHRVFromSISU = getTodayHRVFromSISU;
window.adjustedBlockLengthsFromSISU = adjustedBlockLengthsFromSISU;
window.loadSisuSettings = loadSisuSettings;
window.sendWorkoutToSisu = sendWorkoutToSisu;