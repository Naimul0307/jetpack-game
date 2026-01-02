/* =====================================================
   DEFAULT GAME SETTINGS
===================================================== */
const DEFAULT_SETTINGS = {
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
  bombHorizontalSpeed: 1.2
};
// Get CSS variables for canvas UI
const rootStyle = getComputedStyle(document.documentElement);
const uiFontSize = rootStyle.getPropertyValue('--game-ui-font-size').trim() || '28px';
const uiColor = rootStyle.getPropertyValue('--game-ui-color').trim() || '#fff';
const uiFontFamily = rootStyle.getPropertyValue('--font-family').trim() || 'Arial';

function drawUI() {
  ctx.fillStyle = uiColor;
  ctx.font = `${uiFontSize} ${uiFontFamily}`;
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Time: ${Math.ceil(timeLeft)}`, 20, 80);
}

/* =====================================================
   LOAD SETTINGS FROM LOCAL STORAGE
===================================================== */
const SETTINGS = {
  ...DEFAULT_SETTINGS,
  ...JSON.parse(localStorage.getItem("gameSettings") || "{}")
};

/* =====================================================
   CANVAS SETUP
===================================================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 40;
}
window.addEventListener("resize", resizeCanvas);

/* =====================================================
   PLAYER
===================================================== */
const player = {
  x: 0,
  y: 0,
  width: SETTINGS.playerSize,
  height: SETTINGS.playerSize,
  vx: 0,
  vy: 0,
  accel: 1.9,
  maxSpeed: SETTINGS.playerSpeed,
  friction: 0.9,
  hitRed: 0
};

const hitboxPadding = 10;

/* =====================================================
   INPUT
===================================================== */
const keys = { up: false, down: false, left: false, right: false };
document.addEventListener("keydown", e => {
  if (["ArrowUp","w"].includes(e.key)) keys.up = true;
  if (["ArrowDown","s"].includes(e.key)) keys.down = true;
  if (["ArrowLeft","a"].includes(e.key)) keys.left = true;
  if (["ArrowRight","d"].includes(e.key)) keys.right = true;
});
document.addEventListener("keyup", e => {
  if (["ArrowUp","w"].includes(e.key)) keys.up = false;
  if (["ArrowDown","s"].includes(e.key)) keys.down = false;
  if (["ArrowLeft","a"].includes(e.key)) keys.left = false;
  if (["ArrowRight","d"].includes(e.key)) keys.right = false;
});

/* =====================================================
   GAME STATE
===================================================== */
let score = 0;
let gameOver = false;
let totalTime = SETTINGS.time;
let timeLeft = totalTime;
let objects = [];
let spawnTimer = 0;
let lastTime = 0;

/* =====================================================
   IMAGES
===================================================== */
const santaImg = new Image();
const damageImg = new Image();
let giftImages = [];
let bombImages = [];

/* =====================================================
   IMAGE PRELOAD
===================================================== */
function preloadImages(urls) {
  return Promise.all(urls.map(src => new Promise(resolve => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // skip broken images
  }))).then(results => results.filter(Boolean));
}

/* =====================================================
   SPAWN OBJECTS
===================================================== */
function spawnObject() {
  if (!giftImages.length || !bombImages.length) return;

  const isBomb = Math.random() < 0.1;

  if (!isBomb && objects.filter(o => o.type === "gift").length >= SETTINGS.maxGifts) return;
  if (isBomb && objects.filter(o => o.type === "bomb").length >= SETTINGS.maxBombs) return;

  const img = isBomb
    ? bombImages[Math.floor(Math.random() * bombImages.length)]
    : giftImages[Math.floor(Math.random() * giftImages.length)];

  objects.push({
    x: Math.random() * (canvas.width - SETTINGS.giftSize),
    y: -SETTINGS.giftSize,
    size: isBomb ? SETTINGS.bombSize : SETTINGS.giftSize,
    vx: isBomb ? (Math.random() - 0.5) * SETTINGS.bombHorizontalSpeed : 0,
    vy: isBomb
      ? SETTINGS.bombSpeedMin + Math.random() * (SETTINGS.bombSpeedMax - SETTINGS.bombSpeedMin)
      : SETTINGS.giftSpeedMin + Math.random() * (SETTINGS.giftSpeedMax - SETTINGS.giftSpeedMin),
    type: isBomb ? "bomb" : "gift",
    img
  });
}

/* =====================================================
   COLLISION DETECTION
===================================================== */
function collide(player, obj) {
  const px = player.x + hitboxPadding;
  const py = player.y + hitboxPadding;
  const pw = player.width - hitboxPadding*2;
  const ph = player.height - hitboxPadding*2;
  return px < obj.x + obj.size && px + pw > obj.x && py < obj.y + obj.size && py + ph > obj.y;
}

/* =====================================================
   GAME LOOP
===================================================== */
function update(time = 0) {
  if (gameOver) return;

  const delta = Math.min((time - lastTime) / 16.666, 1.8);
  lastTime = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player movement
  if (keys.up) player.vy -= player.accel * delta;
  if (keys.down) player.vy += player.accel * delta;
  if (keys.left) player.vx -= player.accel * delta;
  if (keys.right) player.vx += player.accel * delta;

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > player.maxSpeed) {
    const s = player.maxSpeed / speed;
    player.vx *= s;
    player.vy *= s;
  }

  player.vx *= player.friction;
  player.vy *= player.friction;

  player.x += player.vx * delta;
  player.y += player.vy * delta;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // Draw player
  if (player.hitRed > 0) {
    ctx.drawImage(damageImg, player.x, player.y, player.width, player.height);
    player.hitRed -= delta;
  } else {
    ctx.drawImage(santaImg, player.x, player.y, player.width, player.height);
  }

  // Spawn objects
  spawnTimer += delta;
  if (spawnTimer > 40) {
    spawnObject();
    spawnTimer = 0;
  }

  // Update objects
  objects.forEach((o, i) => {
    o.x += o.vx * delta;
    o.y += o.vy * delta;

    ctx.drawImage(o.img, o.x, o.y, o.size, o.size);

    if (collide(player, o)) {
      if (o.type === "gift") score += 50;
      else {
        player.hitRed = 20;
        score -= 25;
        if (score < 0) score = 0;
      }
      objects.splice(i, 1);
    }

    if (o.y > canvas.height + 100) objects.splice(i, 1);
  });

  // Timer
  timeLeft -= delta / 60;
  if (timeLeft <= 0) {
    gameOver = true;
    timeLeft = 0;
    fetch("/api/saveScore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: localStorage.getItem("username"), score })
    }).then(() => window.location.href = "/scoreboard");
  }
  // UI
  drawUI();
  requestAnimationFrame(update);
}

/* =====================================================
   INITIALIZATION
===================================================== */
resizeCanvas();

Promise.all([
  fetch("/api/player").then(res => res.json()),
  fetch("/api/gifts").then(res => res.json()),
  fetch("/api/bombs").then(res => res.json())
])
.then(([playerImgs, gifts, bombs]) => {
  // Player images
  santaImg.src = playerImgs.santa || "/assets/santa.png";
  damageImg.src = playerImgs.damage || "/assets/damage.png";

  // Fallback default images if none uploaded
  if (!gifts.length) gifts = ["/assets/gift-default.png"];
  if (!bombs.length) bombs = ["/assets/bomb-default.png"];

  return Promise.all([
    preloadImages(gifts),
    preloadImages(bombs)
  ]);
})
.then(([giftsLoaded, bombsLoaded]) => {
  giftImages = giftsLoaded;
  bombImages = bombsLoaded;
  requestAnimationFrame(update);
})
.catch(err => console.error("Error loading images:", err));
