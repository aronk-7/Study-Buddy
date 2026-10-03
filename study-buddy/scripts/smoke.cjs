const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "study-buddy-smoke-"));
process.env.STUDY_BUDDY_DATA_DIR = data;
const Overlay = require("../main/overlay.cjs");
let desktopController;
const createOverlay = Overlay.prototype.create;
Overlay.prototype.create = function () {
  desktopController = this;
  return createOverlay.call(this);
};
require("../main/main.cjs");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click(window, selector) {
  const point = await window.webContents.executeJavaScript(`(() => {
    const rectangle = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: Math.round(rectangle.x + rectangle.width / 2), y: Math.round(rectangle.y + rectangle.height / 2) };
  })()`);
  window.webContents.sendInputEvent({ type: "mouseMove", ...point });
  window.webContents.sendInputEvent({
    type: "mouseDown",
    button: "left",
    clickCount: 1,
    ...point,
  });
  window.webContents.sendInputEvent({
    type: "mouseUp",
    button: "left",
    clickCount: 1,
    ...point,
  });
  await wait(150);
}

(async () => {
  try {
    await app.whenReady();
    let win;
    for (let i = 0; i < 200; i++) {
      win = BrowserWindow.getAllWindows().find(
        (w) => w.getBounds().width > 800,
      );
      if (
        win &&
        !win.webContents.isLoading() &&
        (await win.webContents.executeJavaScript(
          'Boolean(window.studyBuddy && document.querySelector(".onboarding"))',
        ))
      )
        break;
      await wait(100);
    }
    assert.ok(win, "Dashboard launches");
    const errors = [];
    win.webContents.on("console-message", (details) => {
      if (details.level === "error") errors.push(details.message);
    });
    const js = (code) => win.webContents.executeJavaScript(code);
    const action = (name, payload) =>
      js(
        `window.studyBuddy.act(${JSON.stringify(name)}, ${JSON.stringify(payload)})`,
      );
    const captureDir = process.env.STUDY_BUDDY_CAPTURE_DIR;
    async function capture(window, name) {
      if (!captureDir) return;
      window.webContents.invalidate();
      await wait(300);
      fs.mkdirSync(captureDir, { recursive: true });
      let timeout;
      try {
        const image = await Promise.race([
          window.webContents.capturePage(),
          new Promise((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("Screenshot timed out")),
              5000,
            );
          }),
        ]);
        fs.writeFileSync(path.join(captureDir, name + ".png"), image.toPNG());
      } catch (error) {
        console.warn("Optional screenshot skipped:", name, error.message);
      } finally {
        clearTimeout(timeout);
      }
    }
    await capture(win, "onboarding");
    assert.equal(
      await js('document.querySelectorAll(".step-dots span").length'),
      2,
    );
    await js(`(() => {
      const input = document.querySelector('.name-field input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Sunny');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await click(win, ".meet-buddy .primary");
    assert.equal(
      await js('Boolean(document.querySelector(".onboard-content"))'),
      true,
    );
    let state = await action("subject:add", {
      name: "Networking",
      code: "COSC1111",
      semester: "Semester 2",
      color_hex: "#81987c",
    });
    const subject = state.subjects[0].id;
    await click(win, ".onboard-actions .primary");
    assert.equal(win.isVisible(), true, "Onboarding keeps Today open");
    state = await js("window.studyBuddy.getState()");
    assert.equal(state.onboarded, true);
    const overlay = BrowserWindow.getAllWindows().find(
      (w) => w.getBounds().width === 190,
    );
    assert.ok(overlay);
    assert.equal(overlay.isVisible(), true);
    assert.equal(overlay.isAlwaysOnTop(), true);
    assert.equal(overlay.isFocusable(), false);
    assert.deepEqual(
      await js(
        'Array.from(document.querySelectorAll("nav button"), button => button.textContent)',
      ),
      ["Today", "Courses", "Buddy", "Settings"],
    );

    state = await action("subject:add", {
      name: "Programming",
      code: "IFB102",
      color_hex: "#bb947d",
    });
    const otherSubject = state.subjects[1].id;
    await action("course:update", {
      id: subject,
      name: "Networking",
      code: "COSC1111",
      semester: "Semester 2, 2026",
      color_hex: "#81987c",
    });
    state = await action("assessment:add", {
      subject_id: otherSubject,
      title: "Programming Assignment",
      due_date: state.day,
      weight: 30,
    });
    const assessment = state.assessments[0].id;
    state = await action("milestone:add", {
      assessment_id: assessment,
      title: "Write an outline",
      estimated_pomodoros: 2,
    });
    await click(win, ".next-study .primary");
    state = await js("window.studyBuddy.getState()");
    assert.equal(state.tasks.length, 1);
    assert.equal(state.tasks[0].milestone_id, state.nextStudy.milestone_id);
    assert.equal(
      await js(
        'Number(document.querySelector(".subject-select select").value)',
      ),
      otherSubject,
    );
    assert.equal(await js("document.activeElement.id"), "focus-panel");
    assert.equal(
      state.timer.status,
      "idle",
      "Suggestion prepares but never starts focus",
    );
    await click(win, ".next-study .primary");
    assert.equal(
      (await js("window.studyBuddy.getState()")).tasks.length,
      1,
      "Recommendation deduplicates",
    );
    await action("task:add", {
      subject_id: subject,
      description: "Read lecture notes",
      estimated_pomodoros: 1,
    });
    const mood = state.pet.current_mood;
    const plannedTask = state.tasks[0].id;
    state = await action("task:toggle", { id: plannedTask });
    assert.equal(state.pet.current_mood, mood + 5);
    assert.equal(state.animation, "happy");
    await action("task:toggle", { id: plannedTask });
    state = await action("task:toggle", { id: plannedTask });
    assert.equal(state.pet.current_mood, mood + 5);

    await click(overlay, ".desktop-pet");
    state = await js("window.studyBuddy.getState()");
    assert.ok(state.notice);
    assert.equal(
      state.pet.current_mood,
      mood + 5,
      "Desktop click has no reward",
    );
    win.hide();
    await click(overlay, ".overlay-controls button");
    assert.equal(win.isVisible(), true);
    assert.ok(
      await js('document.querySelector(".today-grid")'),
      "Desktop bubble opens Today",
    );
    await action("overlay:move");
    const before = overlay.getPosition();
    await overlay.webContents.executeJavaScript(
      'window.studyBuddy.act("overlay:drag", {dx:-20, dy:-20})',
    );
    assert.notDeepEqual(overlay.getPosition(), before);
    await action("overlay:lock");
    await action("overlay:roam", { enabled: false });
    const parked = overlay.getPosition();
    await wait(300);
    assert.deepEqual(overlay.getPosition(), parked);
    await action("overlay:roam", { enabled: true });
    win.hide();
    await wait(3100);
    assert.notDeepEqual(
      overlay.getPosition(),
      parked,
      "Roams while dashboard is closed",
    );
    await action("dashboard:open");

    for (const page of ["Today", "Courses", "Buddy", "Settings"]) {
      await js(
        `Array.from(document.querySelectorAll('nav button')).find(button => button.textContent === ${JSON.stringify(page)}).click()`,
      );
      await wait(150);
      assert.ok(await js('document.querySelector("h1")?.textContent'));
      assert.ok(
        await js("document.documentElement.scrollWidth <= innerWidth"),
        page + " fits the window",
      );
      await capture(win, page.toLowerCase());
    }
    win.webContents.send("ui:page", "Buddy");
    await wait(150);
    const beforeChoice = await js("window.studyBuddy.getState()");
    await click(win, '[data-buddy="penguin"]');
    state = await js("window.studyBuddy.getState()");
    assert.equal(state.pet.pet_type, "penguin");
    assert.equal(state.pet.name, beforeChoice.pet.name);
    assert.equal(state.pet.current_streak, beforeChoice.pet.current_streak);
    assert.equal(
      await js(
        'document.querySelector(".buddy-portrait .mascot").dataset.type',
      ),
      "penguin",
    );
    assert.equal(
      await js('document.querySelectorAll(".buddy-portrait .mascot").length'),
      1,
    );
    assert.equal(
      await overlay.webContents.executeJavaScript(
        'document.querySelector(".mascot").dataset.type',
      ),
      "penguin",
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(data, "buddy-state.json"), "utf8"))
        .pet.pet_type,
      "penguin",
    );
    await click(win, '[data-buddy="duckling"]');
    assert.equal(
      (await js("window.studyBuddy.getState()")).pet.pet_type,
      "duckling",
    );
    win.webContents.send("ui:page", "Today");
    await wait(150);
    await action("settings:save", {
      ...state.settings,
      work: 1,
      shortBreak: 1,
      notifications: false,
    });
    await action("pet:choose", { type: "penguin" });
    await action("timer:start", { subject_id: otherSubject });
    await wait(200);
    assert.equal(
      (await js("window.studyBuddy.getState()")).animation,
      "studying",
    );
    assert.ok(
      await overlay.webContents.executeJavaScript(
        'Boolean(document.querySelector(".mascot-studying .mascot-book"))',
      ),
    );

    await wait(1100);
    await action("timer:pause");
    state = await js("window.studyBuddy.getState()");
    assert.equal(state.timer.status, "paused");
    assert.ok(state.timer.remaining < 60);
    await action("timer:start", { subject_id: otherSubject });
    await wait(300);
    await capture(overlay, "desktop-studying");
    await capture(win, "studying");
    // Check the issued position; native window coordinates can settle after a move.
    const focusPosition = { ...desktopController.position };
    // A real one-minute focus session checks the visible completion transition.
    for (let i = 0; i < 70; i++) {
      await wait(1000);
      assert.deepEqual(
        desktopController.position,
        focusPosition,
        "No roaming positions issued during focus",
      );
      state = await js("window.studyBuddy.getState()");
      if (state.timer.phase !== "work") break;
    }
    assert.equal(state.animation, "celebrating");
    assert.equal(state.sessions.filter((s) => s.completed).length, 1);
    await capture(overlay, "desktop-celebrating");
    await wait(4500);
    assert.equal(
      (await js("window.studyBuddy.getState()")).animation,
      "resting",
    );
    await capture(overlay, "desktop-resting");
    win.setSize(900, 650);
    for (const page of ["Today", "Courses", "Buddy", "Settings"]) {
      win.webContents.send("ui:page", page);
      await wait(150);
      assert.ok(
        await js("document.documentElement.scrollWidth <= innerWidth"),
        page + " fits minimum width",
      );
    }
    win.setSize(1180, 850);
    win.webContents.send("ui:page", "Today");
    await action("pet:choose", { type: "duckling" });
    await action("timer:reset");
    await action("settings:save", {
      ...state.settings,
      work: 25,
      shortBreak: 5,
    });
    state = await js("window.studyBuddy.getState()");
    assert.equal(state.timer.remaining, 1500);
    assert.equal(state.pet.name, "Sunny");
    await action("pet:rename", { name: "Sunny" });
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(data, "buddy-state.json"), "utf8"))
        .pet.name,
      "Sunny",
    );
    await js("window.scrollTo(0, 0)");
    await capture(win, "today");
    assert.deepEqual(errors, []);
    const DB = require("../main/db.cjs");
    const db = new DB(path.join(data, "study-buddy.sqlite"));
    assert.equal(db.subjects().length, 2);
    assert.equal(db.db.pragma("foreign_key_check").length, 0);
    assert.equal(db.db.pragma("integrity_check", { simple: true }), "ok");
    db.close();
    console.log(
      "PASS: two-step onboarding, four pages, native desktop clicks, secure IPC, course/assessment/milestone planning, selected timer without autostart, tasks, once-only rewards, naming, movement/roaming, real focus completion, celebration/rest, and SQLite persistence.",
    );
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
})();
setTimeout(() => {
  console.error("Smoke test timed out");
  app.exit(1);
}, 150000).unref();
