const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  Notification,
  powerMonitor,
} = require("electron");
const path = require("node:path");
const StudyDB = require("./db.cjs");
const Engine = require("./engine.cjs");
const Overlay = require("./overlay.cjs");

let engine;
let db;
let overlay;
let dashboard;
let tray;
let ticker;
let quitting = false;
let lastTrayKey = "";
const pages = ["Today", "Courses", "Buddy", "Settings"];
const devURL = process.env.STUDY_BUDDY_DEV_URL;

if (devURL && devURL !== "http://127.0.0.1:5173")
  throw new Error("Unsupported development URL.");
if (process.env.STUDY_BUDDY_DATA_DIR)
  app.setPath("userData", process.env.STUDY_BUDDY_DATA_DIR);
app.setName("Study Buddy");
if (process.platform === "win32")
  app.setAppUserModelId("com.studybuddy.desktop");
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

function load(window, view = "dashboard") {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  return devURL
    ? window.loadURL(`${devURL}/?view=${view}`)
    : window.loadFile(path.join(__dirname, "../dist/index.html"), {
        query: { view },
      });
}

function openDashboard(page = "Today") {
  const destination = pages.includes(page) ? page : "Today";
  if (!dashboard || dashboard.isDestroyed()) {
    dashboard = new BrowserWindow({
      width: 1180,
      height: 850,
      minWidth: 900,
      minHeight: 650,
      title: "Study Buddy",
      backgroundColor: "#faf7ef",
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    dashboard.once("ready-to-show", () => {
      dashboard.webContents.send("ui:page", destination);
      dashboard.show();
    });
    dashboard.on("close", (event) => {
      if (!quitting) {
        event.preventDefault();
        dashboard.hide();
      }
    });
    load(dashboard);
  } else {
    dashboard.webContents.send("ui:page", destination);
    dashboard.show();
    dashboard.focus();
  }
}

function trayIcon(streak) {
  const pixels = Buffer.alloc(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const head = Math.hypot((x - 16) / 11, (y - 14) / 11) <= 1;
      const eye = (x === 12 || x === 20) && y >= 12 && y <= 14;
      const beak = x >= 14 && x <= 18 && y >= 17 && y <= 19;
      const color = eye
        ? [58, 70, 62]
        : beak
          ? [218, 145, 79]
          : head
            ? [247, 216, 134]
            : [115, 144, 120];
      const index = (y * 32 + x) * 4;
      pixels[index] = color[2];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[0];
      pixels[index + 3] = 255;
    }
  }
  const glyphs = [
    "111101101101111",
    "010110010010111",
    "111001111100111",
    "111001111001111",
    "101101111001001",
    "111100111001111",
    "111100111101111",
    "111001001001001",
    "111101111101111",
    "111101111001111",
  ];
  const label = String(Math.min(99, streak));
  label.split("").forEach((digit, offset) => {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        const index =
          ((26 + y) * 32 + 31 - label.length * 4 + offset * 4 + x) * 4;
        const value = glyphs[Number(digit)][y * 3 + x] === "1" ? 255 : 65;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      }
    }
  });
  return nativeImage.createFromBitmap(pixels, { width: 32, height: 32 });
}

function refreshTray() {
  if (!tray || quitting) return;
  const timer = engine.timer;
  const seconds = engine.remaining();
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  tray.setToolTip(
    `${engine.pet.name} · ${timer.phase === "work" ? "Focus" : "Break"} ${countdown} · ${engine.pet.current_streak} day streak`,
  );
  if (process.platform === "darwin")
    tray.setTitle(timer.status === "running" ? countdown : "");
  const tasks = db.tasks();
  const subjects = db.subjects();
  const key = JSON.stringify([
    timer.status,
    timer.phase,
    engine.pet.name,
    engine.pet.current_streak,
    overlay.roaming,
    tasks,
  ]);
  if (key === lastTrayKey) return;
  lastTrayKey = key;
  tray.setImage(trayIcon(engine.pet.current_streak));
  const safe = (action) => () => {
    try {
      action();
    } catch (error) {
      engine.popup(error.message, "idle", 4, false);
      engine.changed();
    }
  };
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label:
          timer.status === "running"
            ? "Pause focus / break"
            : "Start / resume focus or break",
        enabled: subjects.length > 0,
        click: safe(() =>
          timer.status === "running"
            ? engine.pause()
            : engine.start(timer.subject_id || subjects[0].id),
        ),
      },
      { label: "Skip current phase", click: safe(() => engine.advance(false)) },
      { label: "Reset timer", click: safe(() => engine.reset()) },
      { type: "separator" },
      { label: "Open Study Buddy", click: () => openDashboard("Today") },
      { label: "Courses", click: () => openDashboard("Courses") },
      {
        label: "Today’s tasks",
        submenu: tasks.length
          ? tasks.map((task) => ({
              label: task.description,
              type: "checkbox",
              checked: Boolean(task.completed),
              click: safe(() => engine.toggleTask(task.id)),
            }))
          : [{ label: "A fresh start", enabled: false }],
      },
      {
        label: `${engine.pet.name} · ${engine.pet.current_streak} day streak`,
        enabled: false,
      },
      {
        label: "Let buddy roam",
        type: "checkbox",
        checked: overlay.roaming,
        click: (item) => overlay.setRoaming(item.checked),
      },
      {
        label: "Move buddy (30 seconds)",
        click: () => {
          overlay.move();
          broadcast();
        },
      },
      { label: "Settings", click: () => openDashboard("Settings") },
      { type: "separator" },
      { label: "Quit Study Buddy", click: () => app.quit() },
    ]),
  );
}

function currentState() {
  return {
    ...engine.snapshot(),
    ...overlay.activity(),
    roaming: overlay.roaming,
  };
}

function broadcast() {
  if (!engine || !overlay || quitting) return;
  const state = currentState();
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("state:changed", state);
  }
  refreshTray();
}

function trusted(event) {
  return BrowserWindow.getAllWindows().some(
    (window) => window.webContents === event.sender,
  );
}

ipcMain.handle("state:get", (event) => {
  if (!trusted(event)) throw new Error("Untrusted window.");
  return currentState();
});

ipcMain.handle("action", (event, action, payload) => {
  if (!trusted(event)) throw new Error("Untrusted window.");
  const window = BrowserWindow.fromWebContents(event.sender);
  const overlayActions = [
    "overlay:drag",
    "overlay:lock",
    "pet:interact",
    "dashboard:open",
  ];
  if (window === overlay.window && !overlayActions.includes(action))
    throw new Error("Use Study Buddy for this action.");
  switch (action) {
    case "timer:start":
      engine.start(payload?.subject_id);
      break;
    case "timer:pause":
      engine.pause();
      break;
    case "timer:skip":
      engine.advance(false);
      break;
    case "timer:reset":
      engine.reset();
      break;
    case "course:update":
      db.updateCourse(payload);
      break;
    case "assessment:update":
      db.updateAssessment(payload);
      break;
    case "assessment:add":
      db.addAssessment(payload);
      break;
    case "assessment:toggle":
      db.toggleAssessment(payload?.id);
      break;
    case "milestone:add":
      db.addMilestone(payload);
      break;
    case "milestone:toggle":
      db.toggleMilestone(payload?.id);
      break;
    case "study:planNext":
      engine.rollover();
      db.planNext();
      break;
    case "subject:add":
      db.addSubject(payload);
      break;
    case "task:add":
      engine.rollover();
      db.addTask(payload);
      break;
    case "task:toggle":
      engine.toggleTask(payload?.id);
      break;
    case "task:delete":
      db.deleteTask(Number(payload?.id));
      break;
    case "settings:save":
      engine.setSettings(payload);
      break;
    case "pet:choose":
      engine.setPet(payload?.type);
      break;
    case "pet:rename":
      engine.rename(payload?.name);
      break;
    case "pet:interact":
      engine.interact();
      break;
    case "onboard:finish":
      if (!db.subjects().length)
        throw new Error("Add your first course to continue.");
      engine.store.set("onboarded", true);
      engine.popup("Your course is ready.", "happy", 4, false);
      overlay.window.showInactive();
      openDashboard("Today");
      break;
    case "overlay:roam":
      overlay.setRoaming(payload?.enabled);
      break;
    case "overlay:move":
      overlay.move();
      break;
    case "overlay:lock":
      overlay.lock();
      break;
    case "overlay:drag":
      overlay.drag(payload?.dx, payload?.dy);
      break;
    case "dashboard:open":
      openDashboard("Today");
      break;
    default:
      throw new Error("Unknown action.");
  }
  engine.changed();
  return currentState();
});

if (hasLock) {
  app
    .whenReady()
    .then(async () => {
      const { default: Store } = await import("electron-store");
      const store = new Store({ name: "buddy-state" });
      db = new StudyDB(
        path.join(app.getPath("userData"), "study-buddy.sqlite"),
      );
      engine = new Engine(db, store);
      overlay = new Overlay(engine, load);
      overlay.create();
      tray = new Tray(trayIcon(engine.pet.current_streak));
      tray.on("double-click", () => openDashboard("Today"));
      engine.on("change", broadcast);
      engine.on("notice", (notice) => {
        if (engine.settings.notifications && Notification.isSupported()) {
          new Notification({
            title: "Study Buddy",
            body: notice.message,
            silent: true,
          }).show();
        }
      });
      powerMonitor.on("suspend", () => engine.pause());
      powerMonitor.on("lock-screen", () => engine.pause());
      powerMonitor.on("resume", () => {
        engine.rollover();
        broadcast();
      });
      ticker = setInterval(() => engine.tick(), 1000);
      broadcast();
      if (!store.get("onboarded", false)) openDashboard("Today");
      app.on("activate", () => openDashboard("Today"));
    })
    .catch((error) => {
      console.error(error);
      app.exit(1);
    });
}

app.on("second-instance", () => {
  if (engine) openDashboard("Today");
});
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  clearInterval(ticker);
  overlay?.dispose();
  if (engine) {
    engine.pause();
    engine.persist();
  }
  db?.close();
  tray?.destroy();
});
