let wakeLock: any = null;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      // @ts-ignore - Wake Lock types not universally available
      wakeLock = await (navigator as any).wakeLock.request("screen");
      wakeLock.addEventListener("release", () => console.log("Wake lock released by system"));
      console.log("Wake lock activated");
      return true;
    } else {
      console.warn("Wake Lock API not supported");
      return false;
    }
  } catch (error) {
    console.error("Error requesting wake lock:", error);
    return false;
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log("Wake lock released");
    } catch (error) {
      console.error("Error releasing wake lock:", error);
    }
  }
}

export function registerWakeLockGlobals() {
  (window as any).requestWakeLock = requestWakeLock;
  (window as any).releaseWakeLock = releaseWakeLock;
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLock === null) {
      if (typeof (window as any).getSelectedDay === "function" && typeof (window as any).getStartTime === "function") {
        const day = (window as any).getSelectedDay();
        const startTime = (window as any).getStartTime(day);
        if (startTime) {
          await requestWakeLock();
        }
      }
    }
  });
}

export { requestWakeLock, releaseWakeLock };
