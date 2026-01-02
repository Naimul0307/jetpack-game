// --- Default game settings ---
const defaultSettings = {
  time: 60,
  playerSize: 230,
  giftSize: 140,
  bombSize: 160,
  playerSpeed: 12,
  maxGifts: 5,
  maxBombs: 3,
  giftSpeedMin: 1.5,
  giftSpeedMax: 3,
  bombSpeedMin: 2,
  bombSpeedMax: 4,
  bombHorizontalSpeed: 1.2,
  fontFamily: "Arial, sans-serif",
  fontSize: 16
};

// --- Load saved settings ---
const saved = JSON.parse(localStorage.getItem("gameSettings")) || defaultSettings;
Object.keys(defaultSettings).forEach(key => {
  const elem = document.getElementById(key);
  if (elem) elem.value = saved[key];
  if (key === "fontFamily") document.documentElement.style.setProperty("--font-family", saved[key]);
  if (key === "fontSize") document.documentElement.style.setProperty("--font-size", saved[key] + "px");
});

// --- Save settings ---
function saveSettings() {
  const settings = {};
  Object.keys(defaultSettings).forEach(key => {
    const elem = document.getElementById(key);
    if (elem) settings[key] = (key.includes("Size") || key.includes("Speed") || key === "fontSize") ? Number(elem.value) : elem.value;
  });

  localStorage.setItem("gameSettings", JSON.stringify(settings));
  document.documentElement.style.setProperty("--font-family", settings.fontFamily);
  document.documentElement.style.setProperty("--font-size", settings.fontSize + "px");
  alert("✅ Settings saved!");
}

// --- Helper to create image preview with delete button ---
function createImagePreview(container, src, deleteFunc, type) {
  container.innerHTML = "";
  if (src) {
    const div = document.createElement("div");
    div.classList.add("image-item");
    div.innerHTML = `
      <img src="${src}?t=${Date.now()}" width="100">
      <button onclick="${deleteFunc}('${type}')">Delete</button>
    `;
    container.appendChild(div);
  } else {
    container.innerHTML = `<span style="color:#888">No ${type} uploaded</span>`;
  }
}

// --- Load gifts and bombs dynamically ---
async function loadImages() {
  // Gifts
  const giftList = document.getElementById("giftList");
  giftList.innerHTML = "";
  const gifts = await (await fetch("/api/gifts")).json();
  gifts.forEach(f => {
    const div = document.createElement("div");
    div.classList.add("image-item");
    div.innerHTML = `
      <img src="${f}" width="50">
      <button onclick="deleteImage('gift','${f.split('/').pop()}')">Delete</button>
    `;
    giftList.appendChild(div);
  });

  // Bombs
  const bombList = document.getElementById("bombList");
  bombList.innerHTML = "";
  const bombs = await (await fetch("/api/bombs")).json();
  bombs.forEach(f => {
    const div = document.createElement("div");
    div.classList.add("image-item");
    div.innerHTML = `
      <img src="${f}" width="50">
      <button onclick="deleteImage('bomb','${f.split('/').pop()}')">Delete</button>
    `;
    bombList.appendChild(div);
  });
}

async function uploadImage(type) {
  const input = document.getElementById(type + "Upload");
  if (!input.files.length) return alert("Select a file first");

  const formData = new FormData();
  formData.append("image", input.files[0]);
  const res = await fetch(`/api/upload/${type}`, { method: "POST", body: formData });
  alert((await res.json()).message);
  input.value = "";
  loadImages();
}

async function deleteImage(type, filename) {
  if (!confirm(`Delete ${filename}?`)) return;
  const res = await fetch("/api/delete-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, filename })
  });
  alert((await res.json()).message);
  loadImages();
}

// --- Load player images dynamically ---
async function loadPlayerImages() {
  const data = await (await fetch("/api/player")).json();

  createImagePreview(document.getElementById("santaContainer"), data.santa, "deletePlayerImage", "santa");
  createImagePreview(document.getElementById("damageContainer"), data.damage, "deletePlayerImage", "damage");
}

async function uploadPlayerImage(type) {
  const input = document.getElementById(type + "Upload");
  if (!input.files.length) return alert("Select a file first");

  const formData = new FormData();
  const fileName = type === "santa" ? "santa.png" : "damage.png";
  formData.append("image", new File([input.files[0]], fileName, { type: input.files[0].type }));

  const res = await fetch("/api/upload/player", { method: "POST", body: formData });
  alert((await res.json()).message);
  input.value = "";
  loadPlayerImages();
}

async function deletePlayerImage(type) {
  if (!confirm(`Delete ${type}.png?`)) return;
  const res = await fetch("/api/delete-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "player", filename: type + ".png" })
  });
  alert((await res.json()).message);
  loadPlayerImages();
}

// --- Load background images dynamically ---
async function loadBackgrounds() {
  const data = await (await fetch("/api/backgrounds")).json();
  createImagePreview(document.getElementById("bgLandscapeContainer"), data.landscape, "deleteBackgroundImage", "landscape");
  createImagePreview(document.getElementById("bgPortraitContainer"), data.portrait, "deleteBackgroundImage", "portrait");
}

async function uploadBackgroundImage(type) {
  const input = document.getElementById(type === "landscape" ? "bgLandscapeUpload" : "bgPortraitUpload");
  if (!input.files.length) return alert("Select a file first");

  const formData = new FormData();
  formData.append("image", input.files[0]);
  formData.append("type", type);

  const res = await fetch("/api/upload/background", { method: "POST", body: formData });
  alert((await res.json()).message);
  input.value = "";
  loadBackgrounds();
}

async function deleteBackgroundImage(type) {
  if (!confirm(`Delete ${type} background?`)) return;

  const res = await fetch("/api/delete-background", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });
  alert((await res.json()).message);
  loadBackgrounds();
}

// --- Initial calls ---
loadImages();
loadPlayerImages();
loadBackgrounds();
