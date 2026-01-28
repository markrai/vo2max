/**
 * Voice module: announces workout phases when they change.
 * Uses the Web Speech API (SpeechSynthesis). Preference "Voice prompts" in Settings → Preferences.
 */
(function () {
  'use strict';

  var _lastSpokenPhase = null;

  function announcePhaseIfChanged(phaseDisplayName) {
    if (!phaseDisplayName || phaseDisplayName === 'Not Started') {
      resetVoiceState();
      return;
    }
    if (typeof window.getVoicePromptsEnabled !== 'function' || !window.getVoicePromptsEnabled()) {
      return;
    }
    if (phaseDisplayName === _lastSpokenPhase) {
      return;
    }
    _lastSpokenPhase = phaseDisplayName;

    if (!('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(phaseDisplayName);
    u.rate = 0.92;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  function resetVoiceState() {
    _lastSpokenPhase = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  window.announcePhaseIfChanged = announcePhaseIfChanged;
  window.resetVoiceState = resetVoiceState;
})();
