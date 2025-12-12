// User profile management
const defaultProfile = {
  weight: 150,
  height: 70, // 5'10" = 70 inches
  age: 25,
  sex: "male",
  vo2: ""
};

function getProfile() {
  const stored = JSON.parse(localStorage.getItem('profile') || 'null');
  return stored || defaultProfile;
}

function saveProfile() {
  const feet = document.getElementById('heightFeet').value;
  const inches = document.getElementById('heightInches').value;
  const totalInches = (feet && inches) ? (parseInt(feet) * 12 + parseInt(inches)) : "";
  
  const p = {
    weight: document.getElementById('weight').value,
    height: totalInches,
    age: document.getElementById('age').value,
    sex: document.getElementById('sex').value,
    vo2: document.getElementById('vo2').value
  };
  localStorage.setItem('profile', JSON.stringify(p));
  closeModal();
}

function loadProfile() {
  const stored = getProfile();
  document.getElementById('weight').value = stored.weight || "";
  
  // Convert total inches to feet and inches
  const totalInches = stored.height ? parseInt(stored.height) : 0;
  if (totalInches > 0) {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    document.getElementById('heightFeet').value = feet || "";
    document.getElementById('heightInches').value = inches || "";
  } else {
    document.getElementById('heightFeet').value = "";
    document.getElementById('heightInches').value = "";
  }
  
  document.getElementById('age').value = stored.age || "";
  document.getElementById('sex').value = stored.sex || "";
  document.getElementById('vo2').value = stored.vo2 || "";
}

