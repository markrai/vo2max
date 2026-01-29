import { Profile } from "./types.js";

const defaultProfile: Profile = {
  weight: 150,
  height: 70,
  age: 25,
  sex: "male",
  vo2: "",
};

function getProfile(): Profile {
  try {
    const raw = localStorage.getItem("profile");
    if (!raw) return defaultProfile;
    return JSON.parse(raw);
  } catch {
    return defaultProfile;
  }
}

function saveProfile() {
  const feet = (document.getElementById("heightFeet") as HTMLSelectElement | null)?.value;
  const inches = (document.getElementById("heightInches") as HTMLSelectElement | null)?.value;
  const totalInches = feet && inches ? parseInt(feet) * 12 + parseInt(inches) : "";

  const p: Profile = {
    weight: (document.getElementById("weight") as HTMLInputElement | null)?.value ?? "",
    height: totalInches,
    age: (document.getElementById("age") as HTMLInputElement | null)?.value ?? "",
    sex: (document.getElementById("sex") as HTMLSelectElement | null)?.value ?? "",
    vo2: (document.getElementById("vo2") as HTMLInputElement | null)?.value ?? "",
  };
  localStorage.setItem("profile", JSON.stringify(p));
  if (typeof (window as any).closeModal === "function") {
    (window as any).closeModal();
  }
}

function loadProfile() {
  const stored = getProfile();
  const weightEl = document.getElementById("weight") as HTMLInputElement | null;
  if (weightEl) weightEl.value = stored.weight?.toString() ?? "";

  const totalInches = stored.height ? parseInt(stored.height as any) : 0;
  const feetEl = document.getElementById("heightFeet") as HTMLSelectElement | null;
  const inchesEl = document.getElementById("heightInches") as HTMLSelectElement | null;
  if (feetEl && inchesEl) {
    if (totalInches > 0) {
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      feetEl.value = feet ? feet.toString() : "";
      inchesEl.value = inches ? inches.toString() : "";
    } else {
      feetEl.value = "";
      inchesEl.value = "";
    }
  }

  const ageEl = document.getElementById("age") as HTMLInputElement | null;
  if (ageEl) ageEl.value = stored.age?.toString() ?? "";
  const sexEl = document.getElementById("sex") as HTMLSelectElement | null;
  if (sexEl) sexEl.value = stored.sex ?? "";
  const vo2El = document.getElementById("vo2") as HTMLInputElement | null;
  if (vo2El) vo2El.value = stored.vo2?.toString() ?? "";
}

export function registerProfileGlobals() {
  (window as any).saveProfile = saveProfile;
  (window as any).loadProfile = loadProfile;
}

export { getProfile, saveProfile, loadProfile };
