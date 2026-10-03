const { spawnSync } = require("node:child_process");
const path = require("node:path");
for (const file of ["sqlite.integration.cjs", "university.integration.cjs"]) {
  const result = spawnSync(
    require("electron"),
    [path.join(__dirname, "../tests", file)],
    { stdio: "inherit", env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
