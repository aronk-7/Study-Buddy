const { BrowserWindow, screen } = require("electron");
const path = require("node:path");
const {
  WIDTH,
  HEIGHT,
  clampPosition,
  chooseTarget,
  stepToward,
  distance,
  interactionArea,
} = require("./roaming.cjs");

class Overlay {
  constructor(engine, load) {
    this.engine = engine;
    this.load = load;
    this.window = null;
    this.moving = false;
    this.roaming = engine.store.get("roaming", true);
    this.walking = false;
    this.hovered = false;
    this.facing = 1;
    this.passthrough = true;
    this.target = null;
    this.waitUntil = 0;
    this.lastStep = Date.now();
    this.lastSave = 0;
  }

  create() {
    const area = screen.getPrimaryDisplay().workArea;
    this.position = this.clamp(
      this.engine.pet.overlay_position || {
        x: area.x + area.width - WIDTH - 12,
        y: area.y + area.height - HEIGHT - 12,
      },
    );
    this.window = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      ...this.round(this.position),
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      focusable: false,
      acceptFirstMouse: true,
      show: false,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    this.window.setIgnoreMouseEvents(true, { forward: true });
    this.window.setAlwaysOnTop(true, "screen-saver");
    if (process.platform === "darwin") {
      this.window.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
    }
    this.window.once("ready-to-show", () => {
      if (this.engine.store.get("onboarded", false)) this.window.showInactive();
    });
    this.load(this.window, "overlay");
    this.roamTimer = setInterval(() => this.step(), 50);
    this.onDisplayChange = () => {
      this.target = null;
      this.position = this.clamp(this.position);
      this.place();
    };
    screen.on("display-removed", this.onDisplayChange);
    screen.on("display-metrics-changed", this.onDisplayChange);
  }

  round(position) {
    return { x: Math.round(position.x), y: Math.round(position.y) };
  }

  clamp(position) {
    return clampPosition(
      position,
      screen.getDisplayNearestPoint(this.round(position)).workArea,
    );
  }

  place() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.setPosition(
        Math.round(this.position.x),
        Math.round(this.position.y),
      );
    }
  }

  activity() {
    return {
      moving: this.moving,
      walking: this.walking,
      facing: this.facing,
      hovered: this.hovered,
    };
  }

  sendActivity() {
    const key = JSON.stringify(this.activity());
    if (key !== this.lastActivity) {
      this.lastActivity = key;
      this.window.webContents.send("overlay:activity", this.activity());
    }
  }

  savePosition() {
    this.engine.pet.overlay_position = this.round(this.position);
    this.engine.store.set("pet", this.engine.pet);
  }

  setRoaming(enabled) {
    this.roaming = Boolean(enabled);
    this.engine.store.set("roaming", this.roaming);
    this.target = null;
    this.walking = false;
    this.savePosition();
    this.engine.changed();
  }

  updateMouse(cursor, bubble) {
    this.hovered = interactionArea(this.position, cursor, bubble);
    const ignore = !this.moving && !this.hovered;
    if (ignore !== this.passthrough) {
      this.passthrough = ignore;
      this.window.setIgnoreMouseEvents(ignore, { forward: true });
    }
  }

  step() {
    const now = Date.now();
    const elapsed = Math.min(0.1, (now - this.lastStep) / 1000);
    this.lastStep = now;
    if (!this.window || this.window.isDestroyed() || !this.window.isVisible())
      return;
    const cursor = screen.getCursorScreenPoint();
    const bubble = this.engine.notice?.until > this.engine.now();
    const interactiveBubble = bubble || this.hovered || this.moving;
    this.updateMouse(cursor, interactiveBubble);
    const display = screen.getDisplayNearestPoint(cursor);
    const area = display.workArea;
    const activeSession = this.engine.timer.status === "running";
    if (
      this.displayId !== display.id &&
      !this.moving &&
      !this.hovered &&
      !activeSession
    ) {
      this.displayId = display.id;
      this.position = clampPosition(this.position, area);
      this.target = null;
      this.waitUntil = 0;
      this.place();
    }
    if (activeSession && !this.wasActive && !this.moving) {
      const left = area.x + 8;
      const right = area.x + Math.max(8, area.width - WIDTH - 8);
      this.position.x =
        Math.abs(this.position.x - left) < Math.abs(this.position.x - right)
          ? left
          : right;
      this.position = clampPosition(this.position, area);
      this.target = null;
      this.place();
    }
    this.wasActive = activeSession;
    const sleepy =
      !activeSession && now - this.engine.pet.last_active_at >= 180_000;
    if (
      this.moving ||
      !this.roaming ||
      this.hovered ||
      activeSession ||
      bubble ||
      sleepy ||
      now < this.waitUntil
    ) {
      this.walking = false;
      this.sendActivity();
      return;
    }
    if (!this.target || distance(this.position, cursor) < 105)
      this.target = chooseTarget(area, cursor);
    const next = stepToward(this.position, this.target, 28 * elapsed);
    this.walking =
      Math.hypot(next.x - this.position.x, next.y - this.position.y) > 0.01;
    if (Math.abs(next.x - this.position.x) > 0.01)
      this.facing = next.x >= this.position.x ? 1 : -1;
    this.position = next;
    this.place();
    if (Math.hypot(next.x - this.target.x, next.y - this.target.y) < 1) {
      this.target = null;
      this.waitUntil = now + 2000 + Math.random() * 4000;
      this.walking = false;
    }
    if (now - this.lastSave > 15_000) {
      this.savePosition();
      this.lastSave = now;
    }
    this.sendActivity();
  }

  move() {
    this.moving = true;
    this.walking = false;
    this.window.setIgnoreMouseEvents(false);
    this.passthrough = false;
    this.engine.popup(
      "Drag to move. Select Done to finish.",
      "idle",
      30,
      false,
    );
    clearTimeout(this.lockTimeout);
    this.lockTimeout = setTimeout(() => this.lock(), 30_000);
  }

  drag(dx, dy) {
    if (!this.moving || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.position = this.clamp({
      x: this.position.x + dx,
      y: this.position.y + dy,
    });
    this.place();
    this.savePosition();
  }

  lock() {
    this.moving = false;
    clearTimeout(this.lockTimeout);
    this.target = null;
    this.waitUntil = Date.now() + 2000;
    this.savePosition();
    this.engine.notice = null;
    this.engine.changed();
  }

  dispose() {
    clearTimeout(this.lockTimeout);
    clearInterval(this.roamTimer);
    screen.removeListener("display-removed", this.onDisplayChange);
    screen.removeListener("display-metrics-changed", this.onDisplayChange);
    if (this.position) this.savePosition();
  }
}

module.exports = Overlay;
