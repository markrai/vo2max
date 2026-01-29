let lastSpokenPhase: string | null = null;

function announcePhaseIfChanged(phaseDisplayName: string) {
  if (!phaseDisplayName || phaseDisplayName === "Not Started") {
    resetVoiceState();
    return;
  }
  if (typeof (window as any).getVoicePromptsEnabled !== "function" || !(window as any).getVoicePromptsEnabled()) {
    return;
  }
  if (phaseDisplayName === lastSpokenPhase) return;
  lastSpokenPhase = phaseDisplayName;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(phaseDisplayName);
  u.rate = 0.92;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function resetVoiceState() {
  lastSpokenPhase = null;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function registerVoiceGlobals() {
  (window as any).announcePhaseIfChanged = announcePhaseIfChanged;
  (window as any).resetVoiceState = resetVoiceState;
}

export { announcePhaseIfChanged, resetVoiceState };
