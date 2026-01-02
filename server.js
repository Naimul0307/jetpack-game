const express = require("express");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const multer = require("multer");

const app = express();
app.use(express.json()); // parse JSON POST body

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/templates/index.html")));
app.get("/game", (req, res) => res.sendFile(path.join(__dirname, "public/templates/game.html")));
app.get("/scoreboard", (req, res) => res.sendFile(path.join(__dirname, "public/templates/scoreboard.html")));
app.get("/settings", (req, res) => res.sendFile(path.join(__dirname, "public/templates/settings.html")));

// --- Excel APIs ---
app.post("/api/saveUser", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email required" });

  const dataFolder = path.join(__dirname, "public/data");
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });

  const filePath = path.join(dataFolder, "users.xlsx");
  let workbook, worksheet;

  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const existingData = XLSX.utils.sheet_to_json(worksheet);
    existingData.push({ Name: name, Email: email });
    worksheet = XLSX.utils.json_to_sheet(existingData);
    workbook.Sheets[workbook.SheetNames[0]] = worksheet;
  } else {
    const newData = [{ Name: name, Email: email }];
    worksheet = XLSX.utils.json_to_sheet(newData);
    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
  }

  XLSX.writeFile(workbook, filePath);
  res.json({ message: "Data saved successfully!" });
});

app.post("/api/saveScore", (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof score !== "number") return res.status(400).json({ message: "Name and score required" });

  const filePath = path.join(__dirname, "public/data/users.xlsx");
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "User file not found" });

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const users = XLSX.utils.sheet_to_json(worksheet);

  const user = users.find(u => u.Name === name);
  if (user) user.Score = score;

  const updatedSheet = XLSX.utils.json_to_sheet(users);
  workbook.Sheets[sheetName] = updatedSheet;
  XLSX.writeFile(workbook, filePath);

  res.json({ message: "Score saved successfully" });
});

app.get("/api/scoreboard", (req, res) => {
  const filePath = path.join(__dirname, "public/data/users.xlsx");
  if (!fs.existsSync(filePath)) return res.json([]);

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  res.json(data.sort((a, b) => (b.Score || 0) - (a.Score || 0)));
});

// --- Multer setups ---
const storageGift = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/assets/gifts"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const uploadGift = multer({ storage: storageGift });

const storageBomb = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/assets/bombs"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const uploadBomb = multer({ storage: storageBomb });

const storagePlayer = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/assets"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const uploadPlayer = multer({ storage: storagePlayer });

// --- Upload APIs ---
app.post("/api/upload/gift", uploadGift.single("image"), (req, res) => {
  res.json({ message: "Gift uploaded", file: req.file.filename });
});

app.post("/api/upload/bomb", uploadBomb.single("image"), (req, res) => {
  res.json({ message: "Bomb uploaded", file: req.file.filename });
});

app.post("/api/upload/player", uploadPlayer.single("image"), (req, res) => {
  const file = req.file;
  let targetName = file.originalname.toLowerCase().includes("santa") ? "santa.png" : "damage.png";
  const targetPath = path.join(__dirname, "public/assets", targetName);

  if (file.originalname !== targetName) {
    fs.renameSync(file.path, targetPath);
  }

  res.json({ message: `Player image uploaded as ${targetName}`, file: targetName });
});

// --- Delete API ---
app.post("/api/delete-image", (req, res) => {
  const { type, filename } = req.body;
  let folder;

  if (type === "gift") folder = path.join(__dirname, "public/assets/gifts");
  else if (type === "bomb") folder = path.join(__dirname, "public/assets/bombs");
  else if (type === "player") folder = path.join(__dirname, "public/assets");
  else return res.status(400).json({ message: "Invalid type" });

  const filePath = path.join(folder, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });

  fs.unlinkSync(filePath);
  res.json({ message: "File deleted" });
});

// --- List APIs ---
app.get("/api/gifts", (req, res) => {
  const folder = path.join(__dirname, "public/assets/gifts");
  const files = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
  res.json(files.filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f)).map(f => `/assets/gifts/${f}`));
});

app.get("/api/bombs", (req, res) => {
  const folder = path.join(__dirname, "public/assets/bombs");
  const files = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
  res.json(files.filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f)).map(f => `/assets/bombs/${f}`));
});

app.get("/api/player", (req, res) => {
  const assets = path.join(__dirname, "public/assets");
  const santaExists = fs.existsSync(path.join(assets, "santa.png"));
  const damageExists = fs.existsSync(path.join(assets, "damage.png"));

  res.json({
    santa: santaExists ? "/assets/santa.png" : "",
    damage: damageExists ? "/assets/damage.png" : ""
  });
});

// --- Background Upload ---
const storageBackground = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/assets/background"),
  filename: (req, file, cb) => {
    const type = req.body.type; // "landscape" or "portrait"
    const filename = type === "portrait" ? "bg-portrait.jpg" : "bg-landscape.jpg";
    cb(null, filename);
  }
});
const uploadBackground = multer({ storage: storageBackground });

// Upload background
app.post("/api/upload/background", uploadBackground.single("image"), (req, res) => {
  const type = req.body.type;
  const name = type === "portrait" ? "bg-portrait.jpg" : "bg-landscape.jpg";
  res.json({ message: `${type} background uploaded as ${name}`, file: name });
});

// Delete background
app.post("/api/delete-background", (req, res) => {
  const { type } = req.body;
  const filename = type === "portrait" ? "bg-portrait.jpg" : "bg-landscape.jpg";
  const filePath = path.join(__dirname, "public/assets/background", filename);

  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
  fs.unlinkSync(filePath);
  res.json({ message: `${type} background deleted` });
});

// Get backgrounds
app.get("/api/backgrounds", (req, res) => {
  const folder = path.join(__dirname, "public/assets/background");
  const landscape = fs.existsSync(path.join(folder, "bg-landscape.jpg")) ? "/assets/background/bg-landscape.jpg" : "";
  const portrait = fs.existsSync(path.join(folder, "bg-portrait.jpg")) ? "/assets/background/bg-portrait.jpg" : "";
  res.json({ landscape, portrait });
});

app.listen(3000, () => {
  console.log("🎅 Santa Jetpack Game running at http://localhost:3000");
});
