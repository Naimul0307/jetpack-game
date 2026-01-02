const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "../public/assets/background/favicon.ico"),
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Load Express app
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // ✅ REGISTER F2 SHORTCUT
  globalShortcut.register("F2", () => {
    if (mainWindow) {
      mainWindow.loadURL("http://localhost:3000/settings");
    }
  });
}

function startServer() {
  serverProcess = spawn("node", ["server.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    shell: true
  });

  serverProcess.on("close", code => {
    console.log("Server exited with code", code);
  });
}

app.whenReady().then(() => {
  startServer();

  // wait for server to boot
  setTimeout(createWindow, 1500);
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();

  if (serverProcess) {
    serverProcess.kill();
  }

  app.quit();
});

app.on("quit", () => {
  globalShortcut.unregisterAll();

  if (serverProcess) {
    serverProcess.kill();
  }
});
