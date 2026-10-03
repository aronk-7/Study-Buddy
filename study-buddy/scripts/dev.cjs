const { spawn } = require("node:child_process");
const path = require("node:path");
const root = path.join(__dirname, "..");
const vite = spawn(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js")],
  { cwd: root, stdio: "inherit" },
);
let desktop;
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  desktop?.kill();
  vite.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
(async () => {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5173");
      if (r.ok) {
        desktop = spawn(require("electron"), ["."], {
          cwd: root,
          stdio: "inherit",
          env: { ...process.env, STUDY_BUDDY_DEV_URL: "http://127.0.0.1:5173" },
        });
        desktop.on("exit", stop);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  console.error("Vite did not start.");
  stop();
  process.exitCode = 1;
})();
