const { contextBridge, ipcRenderer } = require("electron");

const actions = new Set([
  "course:update",
  "assessment:add",
  "assessment:update",
  "assessment:toggle",
  "milestone:add",
  "milestone:toggle",
  "study:planNext",
  "timer:start",
  "timer:pause",
  "timer:skip",
  "timer:reset",
  "subject:add",
  "task:add",
  "task:toggle",
  "task:delete",
  "settings:save",
  "pet:rename",
  "pet:choose",
  "pet:interact",
  "onboard:finish",
  "overlay:move",
  "overlay:roam",
  "overlay:lock",
  "overlay:drag",
  "dashboard:open",
]);

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("studyBuddy", {
  getState: () => ipcRenderer.invoke("state:get"),
  act: (action, payload) => {
    if (!actions.has(action))
      return Promise.reject(new Error("Unknown action."));
    return ipcRenderer.invoke("action", action, payload);
  },
  subscribe: (callback) => subscribe("state:changed", callback),
  subscribeOverlay: (callback) => subscribe("overlay:activity", callback),
});

ipcRenderer.on("ui:page", (_event, page) => {
  if (["Today", "Courses", "Buddy", "Settings"].includes(page)) {
    window.dispatchEvent(new CustomEvent("buddy:page", { detail: page }));
  }
});
